import { asyncHandler } from "../middlewares/asyncHandler.js";
import { badRequest, conflict, unauthorized } from "../utils/ApiError.js";
import { requireEmail, requireString } from "../utils/validate.js";
import {
  authenticate,
  clearAuthCookie,
  registerCustomer,
  setAuthCookie,
  signToken,
} from "../services/auth.service.js";
import {
  findUserByEmail,
  getPublicUserById,
} from "../services/users.service.js";

function requirePassword(value) {
  if (typeof value !== "string" || value.length < 8) {
    throw badRequest("Password must be at least 8 characters", {
      field: "password",
    });
  }

  if (value.length > 72) {
    throw badRequest("Password must be at most 72 characters", {
      field: "password",
    });
  }

  return value;
}

export const register = asyncHandler(async (req, res) => {
  const name = requireString(req.body?.name, "Name", { min: 2, max: 120 });
  const email = requireEmail(req.body?.email);
  const password = requirePassword(req.body?.password);

  const existing = await findUserByEmail(email);

  if (existing) {
    throw conflict("An account with this email already exists");
  }

  const user = await registerCustomer({ name, email, password });

  return res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: user,
  });
});

export const login = asyncHandler(async (req, res) => {
  const email = requireEmail(req.body?.email);

  if (typeof req.body?.password !== "string" || !req.body.password) {
    throw badRequest("Password is required", { field: "password" });
  }

  const user = await authenticate({
    email,
    password: req.body.password,
  });

  setAuthCookie(res, signToken(user));

  return res.status(200).json({
    success: true,
    message: "Signed in successfully",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);

  return res.status(200).json({ success: true, message: "Signed out" });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(200).json({ success: true, data: null });
  }

  const user = await getPublicUserById(req.user.id);

  if (!user || !user.is_active) {
    clearAuthCookie(res);
    return res.status(200).json({ success: true, data: null });
  }

  return res.status(200).json({ success: true, data: user });
});

export const requireAdminSession = asyncHandler(async (req, res) => {
  if (!req.admin) {
    throw unauthorized();
  }

  return res.status(200).json({ success: true, data: req.admin });
});
