const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

export function parsePagination(query = {}, defaultLimit = DEFAULT_LIMIT) {
  const rawPage = Number.parseInt(query.page, 10);
  const rawLimit = Number.parseInt(query.limit, 10);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : defaultLimit;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function buildMeta({ page, limit, total }) {
  const safeTotal = Number(total) || 0;

  return {
    page,
    limit,
    total: safeTotal,
    totalPages: Math.max(1, Math.ceil(safeTotal / limit)),
  };
}

export const ALLOWED_SORT_DIRECTIONS = new Set(["asc", "desc"]);

export function parseSort(query, allowedColumns, fallback, defaultDirection = "desc") {
  const requested = typeof query.sort === "string" ? query.sort : "";
  // Object.hasOwn avoids walking the prototype chain (e.g. sort=constructor or
  // sort=__proto__ would otherwise resolve to a truthy inherited value and
  // bypass the allowlist).
  const column = Object.hasOwn(allowedColumns, requested)
    ? allowedColumns[requested]
    : fallback;

  const requestedDirection =
    typeof query.order === "string" ? query.order.trim().toLowerCase() : "";

  const direction = ALLOWED_SORT_DIRECTIONS.has(requestedDirection)
    ? requestedDirection
    : defaultDirection;

  return { column, direction };
}
