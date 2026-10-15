import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { unauthorized } from "../utils/ApiError.js";
import {
  createUser,
  findUserByEmail,
} from "./users.service.js";

// Used to equalize timing when the account does not exist.
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEeO3F6h0m8Xf9aQd4S8b1Y4pQ0jZ8oQ4S2";

export function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptRounds);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      email: user.email,
      name: user.name,
      is_demo: Boolean(user.is_demo),
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookie(res, token) {
  res.cookie(env.cookieName, token, cookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/",
  });
}

export async function registerCustomer({ name, email, password }) {
  const passwordHash = await hashPassword(password);

  // Role is forced to "customer"; request bodies can never choose a role.
  return createUser({
    name,
    email,
    passwordHash,
    role: "customer",
    isDemo: env.demoMode,
  });
}

export async function authenticate({ email, password }) {
  const user = await findUserByEmail(email);
  const hash = user?.password_hash || DUMMY_HASH;

  const matches = await verifyPassword(password, hash);

  if (!user || !matches || !user.is_active) {
    throw unauthorized("Invalid email or password");
  }

  return user;
}
