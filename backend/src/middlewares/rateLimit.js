import rateLimit from "express-rate-limit";

const jsonHandler = (message) => (req, res) => {
  res.status(429).json({ success: false, message });
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler("Too many requests. Please slow down."),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: jsonHandler(
    "Too many login attempts. Please try again in 15 minutes."
  ),
});

export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler(
    "Too many order attempts. Please try again later."
  ),
});

// Demo reset rebuilds the whole sandbox; keep it rare to protect the shared
// demo database from abuse.
export const demoResetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler(
    "Demo data was reset too many times. Please wait a few minutes."
  ),
});
