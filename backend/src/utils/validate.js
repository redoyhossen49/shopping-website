import { badRequest } from "./ApiError.js";

export function requireString(value, field, { min = 1, max = 5000 } = {}) {
  if (typeof value !== "string" || value.trim().length < min) {
    throw badRequest(`${field} is required`, { field });
  }

  const trimmed = value.trim();

  if (trimmed.length > max) {
    throw badRequest(`${field} must be at most ${max} characters`, {
      field,
    });
  }

  return trimmed;
}

export function optionalString(
  value,
  field,
  { max = 5000 } = {}
) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw badRequest(`${field} must be text`, { field });
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > max) {
    throw badRequest(`${field} must be at most ${max} characters`, {
      field,
    });
  }

  return trimmed;
}

/**
 * Normalizes a free-text search query parameter: trims, enforces a length
 * cap, and returns "" when absent. Keeps user input bounded before it reaches
 * an ILIKE pattern.
 */
export function optionalSearch(value, { max = 100 } = {}) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw badRequest("Invalid search query", { field: "search" });
  }

  const trimmed = value.trim();

  if (trimmed.length > max) {
    throw badRequest(`Search must be at most ${max} characters`, {
      field: "search",
    });
  }

  return trimmed;
}

/**
 * Validates an optional enum-style query parameter against an allowlist.
 * Absent values return "". Unknown values raise a 400 so callers never
 * silently receive an empty result set for a typo'd filter.
 */
export function optionalEnum(value, field, allowed) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "") {
    return "";
  }

  if (!allowed.includes(normalized)) {
    throw badRequest(
      `Invalid ${field}. Allowed values: ${allowed.join(", ")}`,
      { field }
    );
  }

  return normalized;
}

export function requireEmail(value) {
  if (typeof value !== "string") {
    throw badRequest("A valid email address is required", {
      field: "email",
    });
  }

  const trimmed = value.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (trimmed.length > 254 || !emailPattern.test(trimmed)) {
    throw badRequest("A valid email address is required", {
      field: "email",
    });
  }

  return trimmed;
}

export function requirePositiveNumber(value, field) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw badRequest(`${field} must be a number greater than zero`, {
      field,
    });
  }

  // Round to 2 decimals to match numeric(12,2).
  return Math.round(parsed * 100) / 100;
}

export function requireNonNegativeNumber(value, field) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw badRequest(`${field} must be zero or greater`, { field });
  }

  return Math.round(parsed * 100) / 100;
}

export function requireNonNegativeInt(value, field) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw badRequest(`${field} must be a whole number of zero or greater`, {
      field,
    });
  }

  return parsed;
}

export function requirePositiveInt(value, field) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest(`${field} must be a whole number greater than zero`, {
      field,
    });
  }

  return parsed;
}

export function optionalBoolean(value, field) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "false") {
    return value === "true";
  }

  throw badRequest(`${field} must be true or false`, { field });
}

export function optionalUrl(value, field) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw badRequest(`${field} must be a URL`, { field });
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw badRequest(`${field} must be a valid URL`, { field });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw badRequest(`${field} must be an http or https URL`, { field });
  }

  return trimmed;
}

export function requireIdParam(value, field = "id") {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw badRequest(`Invalid ${field}`, { field });
  }

  return Number(value);
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
