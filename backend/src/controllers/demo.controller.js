import { env } from "../config/env.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { forbidden } from "../utils/ApiError.js";
import { resetAndSeedDemo, demoStatus, ensureDemoAdmin } from "../services/demo.service.js";
import { setAuthCookie, signToken } from "../services/auth.service.js";

export const getDemoStatusController = asyncHandler(async (req, res) => {
  const status = await demoStatus();

  return res.status(200).json({
    success: true,
    data: { demoMode: env.demoMode, ...status },
  });
});

/**
 * Starts a read-only demo administrator session without exposing any
 * credentials to the browser. Only available when DEMO_MODE is enabled, and
 * rate limited at the route level. The issued token belongs to the dedicated
 * demo admin, so every subsequent query is scoped to is_demo data only, and
 * write requests are rejected by the blockDemoWrites middleware.
 */
export const startDemoSessionController = asyncHandler(async (req, res) => {
  if (!env.demoMode) {
    throw forbidden("Demo mode is disabled on this server");
  }

  const admin = await ensureDemoAdmin();

  setAuthCookie(res, signToken(admin));

  return res.status(200).json({
    success: true,
    message: "Demo session started",
    data: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

/**
 * Rebuilds the demo dataset. Only available when DEMO_MODE is enabled; the
 * reset itself deletes is_demo rows only, so it is safe even on a shared
 * database. Guarded by admin auth + a strict rate limit at the route level.
 */
export const resetDemoController = asyncHandler(async (req, res) => {
  if (!env.demoMode) {
    throw forbidden("Demo mode is disabled on this server");
  }

  const summary = await resetAndSeedDemo();

  return res.status(200).json({
    success: true,
    message: "Demo data reset",
    data: summary,
  });
});
