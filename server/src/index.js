import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import deckRoutes from "./routes/deckRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

const app = express();

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "").toLowerCase();
}

function matchesAllowedOrigin(origin, allowedOrigin) {
  if (allowedOrigin.includes("*")) {
    const regexSafe = allowedOrigin.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${regexSafe}$`).test(origin);
  }
  return origin === allowedOrigin;
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const allowed = env.clientOrigins.some((configuredOrigin) =>
        matchesAllowedOrigin(normalizedOrigin, configuredOrigin)
      );

      if (allowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${normalizedOrigin}`));
    }
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "cuemath-server" });
});

app.use("/api/upload", uploadRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/review", reviewRoutes);
app.use("/api/analytics", analyticsRoutes);

async function bootstrap() {
  await mongoose.connect(env.mongoUri);
  app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
