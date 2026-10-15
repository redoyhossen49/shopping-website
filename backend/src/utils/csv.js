const RISKY_PREFIX = /^[=+\-@\t\r]/;

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);

  if (RISKY_PREFIX.test(text)) {
    text = `'${text}`;
  }

  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv(columns, rows) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");

  const body = rows
    .map((row) =>
      columns.map((column) => escapeCsvValue(row[column.key])).join(",")
    )
    .join("\n");

  return body ? `${header}\n${body}` : header;
}

export function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.status(200).send(csv);
}
