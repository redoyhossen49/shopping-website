import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError, unauthorized, forbidden } from "../utils/ApiError.js";
import { getAuthUserById } from "../services/users.service.js";

/**
 * Reads the JWT from the httpOnly cookie and attaches a lightweight user object.
 * Never throws: invalid/expired tokens simply result in req.user = null.
 */
export function attachUser(req, res, next) {
  req.user = null;

  const token = req.cookies?.[env.cookieName];

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (!payload || !payload.sub) {
      return next();
    }

    req.user = {
      id: Number(payload.sub),
      role: payload.role,
      email: payload.email,
      name: payload.name,
      isDemo: Boolean(payload.is_demo),
    };
  } catch {
    req.user = null;
  }

  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return next(unauthorized());
  }

  return next();
}

/**
 * Authorization is re-verified against the database on every request.
 * A valid token is not enough: the account must exist, be active, and be an admin.
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      throw unauthorized();
    }

    const account = await getAuthUserById(req.user.id);

    if (!account || !account.is_active) {
      throw unauthorized("Your account is not active");
    }

    if (account.role !== "admin") {
      throw forbidden("Admin access required");
    }

    req.admin = {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      is_demo: Boolean(account.is_demo),
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(forbidden());
    }

    return next();
  };
}

export { ApiError };
