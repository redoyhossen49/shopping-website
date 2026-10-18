# Guided production category fix (backup -> dry-run -> optionally apply).
# The connection string is NEVER printed: it is read from $env:DATABASE_URL
# (for automated use) or asked via a masked paste prompt.
# Usage:
#   cd backend
#   .\run-category-fix.ps1                -> asks secret, backup + dry-run only
#   .\run-category-fix.ps1 -ConfirmApply  -> ... + typed confirmation + apply
param(
    [switch]$ConfirmApply
)
$ErrorActionPreference = "Stop"
$ApiUrl = "https://novashop-backend-noo8.onrender.com"

function Stop-Nice([int]$code) {
    if (Get-Item Env:DATABASE_URL -ErrorAction SilentlyContinue) {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    }
    exit $code
}

Write-Host "=================================================="
Write-Host " PRODUCTION CATEGORY FIX (backfill:categories)"
Write-Host "=================================================="

$connString = $env:DATABASE_URL
if (-not $connString) {
    Write-Host ""
    $secure = Read-Host "Paste the Render connection string (hidden input)" -AsSecureString
    $bptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $connString = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bptr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bptr) }
    $env:DATABASE_URL = $connString
}
if ($connString -notmatch "^postgres") {
    Write-Host "ABORT: the pasted value does not look like a Postgres connection string (nothing was changed)."
    if ($env:DATABASE_URL) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
    Stop-Nice 1
}
if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "ABORT: pg_dump not found on PATH. Install PostgreSQL client tools first."
    Stop-Nice 1
}

Write-Host ""
Write-Host "[1/3] Creating backup on Desktop ..."
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$backup = Join-Path $env:USERPROFILE "Desktop\prod-backup-$stamp.dump"
& pg_dump $env:DATABASE_URL -Fc -w -f $backup
if ($LASTEXITCODE -ne 0) { Write-Host "ABORT: pg_dump failed. Nothing was changed."; Stop-Nice 1 }
$size = (Get-Item $backup).Length
if ($size -eq 0) { Write-Host "ABORT: backup file is empty. Nothing was changed."; Stop-Nice 1 }
Write-Host ("Backup OK: {0}  ({1:N0} bytes)" -f $backup, $size)

Write-Host ""
Write-Host "[2/3] Dry-run (no database write happens in this step) ..."
& node src/scripts/backfillCategories.js --dry-run
if ($LASTEXITCODE -ne 0) { Write-Host "ABORT: dry-run failed. Nothing was changed."; Stop-Nice 1 }

if (-not $ConfirmApply) {
    Write-Host ""
    Write-Host "DRY-RUN ONLY. The database was NOT changed."
    Write-Host "Review the list above. To apply for real, run:"
    Write-Host "    .\run-category-fix.ps1 -ConfirmApply"
    Stop-Nice 0
}

Write-Host ""
$answer = Read-Host "Review the dry-run list above. Type YES to apply now (anything else cancels)"
if ($answer -cne "YES") {
    Write-Host "Cancelled. The database was NOT changed. Safe to re-run later."
    Stop-Nice 0
}

Write-Host ""
Write-Host "Applying ..."
& node src/scripts/backfillCategories.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED inside the script transaction - the database is unchanged (rolled back)."
    Stop-Nice 1
}

Write-Host ""
Write-Host "[3/3] Verifying production /api/categories ..."
Start-Sleep -Seconds 3
try {
    $cats = (Invoke-RestMethod "$ApiUrl/api/categories" -TimeoutSec 90).data
    if ($cats.Count -eq 0) { Write-Host "WARNING: API still returns empty (cache can take up to 60s; re-check shortly)." }
    else { $cats | Format-Table id, name, slug, product_count -AutoSize }
} catch { Write-Host "Could not reach the API: $($_.Exception.Message)" }

Write-Host ""
Write-Host "DONE. Keep the backup file:"; Write-Host "  $backup"
Stop-Nice 0

