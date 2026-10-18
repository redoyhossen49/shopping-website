# Guided production category fix (backup -> dry-run -> optionally apply).
# The connection string is read from $env:DATABASE_URL and is never printed.
# Usage:
#   1) cd backend ; $env:DATABASE_URL = "<Render connection string>"
#   2) .\run-category-fix.ps1                -> backup + dry-run preview only
#   3) .\run-category-fix.ps1 -ConfirmApply  -> backup + dry-run + typed confirmation + apply
param(
    [switch]$ConfirmApply
)
$ErrorActionPreference = "Stop"
$ApiUrl = "https://novashop-backend-noo8.onrender.com"

Write-Host "=================================================="
Write-Host " PRODUCTION CATEGORY FIX (backfill:categories)"
Write-Host "=================================================="

if (-not $env:DATABASE_URL) {
    Write-Host "ABORT: DATABASE_URL is not set in this window."
    Write-Host "Run:   `$env:DATABASE_URL = `<Render connection string>`  first."
    exit 1
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "ABORT: pg_dump not found on PATH. Install PostgreSQL client tools first."
    exit 1
}

Write-Host ""
Write-Host "[1/3] Creating backup on Desktop ..."
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$backup = Join-Path $env:USERPROFILE "Desktop\prod-backup-$stamp.dump"
& pg_dump $env:DATABASE_URL -Fc -w -f $backup
if ($LASTEXITCODE -ne 0) { Write-Host "ABORT: pg_dump failed. Nothing was changed."; exit 1 }
$size = (Get-Item $backup).Length
if ($size -eq 0) { Write-Host "ABORT: backup file is empty. Nothing was changed."; exit 1 }
Write-Host ("Backup OK: {0}  ({1:N0} bytes)" -f $backup, $size)

Write-Host ""
Write-Host "[2/3] Dry-run (no database write happens in this step) ..."
& node src/scripts/backfillCategories.js --dry-run
if ($LASTEXITCODE -ne 0) { Write-Host "ABORT: dry-run failed. Nothing was changed."; exit 1 }

if (-not $ConfirmApply) {
    Write-Host ""
    Write-Host "DRY-RUN ONLY. The database was NOT changed."
    Write-Host "Review the list above. To apply for real, run:"
    Write-Host "    .\run-category-fix.ps1 -ConfirmApply"
    exit 0
}

Write-Host ""
$answer = Read-Host "Review the dry-run list above. Type YES to apply now (anything else cancels)"
if ($answer -cne "YES") {
    Write-Host "Cancelled. The database was NOT changed. Safe to re-run later."
    exit 0
}

Write-Host ""
Write-Host "Applying ..."
& node src/scripts/backfillCategories.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED inside the script transaction - the database is unchanged (rolled back)."
    exit 1
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
