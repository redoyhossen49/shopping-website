import express from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { pool } from "./config/db.js";
import { isClientOriginAllowed } from "./config/env.js";

import productsRoutes from "./routes/products.routes.js";
import categoriesPublicRoutes from "./routes/categories.public.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import demoPublicRoutes from "./routes/demo.public.routes.js";
import accountRoutes from "./routes/account.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import { getPublicConfig } from "./controllers/config.controller.js";

import { attachUser } from "./middlewares/auth.js";
import { apiLimiter } from "./middlewares/rateLimit.js";
import { verifyOrigin } from "./middlewares/verifyOrigin.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.disable("x-powered-by");


app.use(
  cors({
    // Never throw here: an unknown origin simply does not receive CORS
    // headers (the browser blocks the response). CSRF on mutating requests is
    // enforced separately by verifyOrigin, which returns 403.
    origin: (origin, callback) =>
      callback(null, isClientOriginAllowed(origin)),
    credentials: true,
  })
);


// Compress JSON/text responses over the default 1kb threshold. This cuts
// transfer size of product/category listings by roughly 70-80%.
app.use(compression());

// Cache policy: public catalog reads may be cached by shared/browser caches,
// while authenticated, account, order, payment and admin responses must never
// be stored because they are user-specific or sensitive.
app.use((req, res, next) => {
  if (
    req.method === "GET" &&
    (req.path.startsWith("/api/products") ||
      req.path.startsWith("/api/categories"))
  ) {
    res.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    );
  } else if (req.path.startsWith("/api")) {
    res.set("Cache-Control", "no-store");
  }

  next();
});

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(attachUser);
app.use(apiLimiter);
app.use(verifyOrigin);

app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesPublicRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/demo", demoPublicRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Shopping backend is running",
  });
});

// Public runtime config for the client (demo mode, store name, currency).
app.get("/api/config", getPublicConfig);

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS current_time");
    res.status(200).json({
      success: true,
      message: "PostgreSQL connected successfully",
      databaseTime: result.rows[0].current_time,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

export default app;
