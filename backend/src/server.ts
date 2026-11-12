import cors from "cors";
import express from "express";
import { createRequire } from "node:module";
import { rateLimit } from "express-rate-limit";
import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import budgetsRouter from "./routes/budgets.js";
import goalsRouter from "./routes/goals.js";
import loansRouter from "./routes/loans.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import activityRouter from "./routes/activity.js";
import settingsRouter from "./routes/settings.js";
import feedbackRouter from "./routes/feedback.js";
import { authenticate } from "./middleware/authenticate.js";

const require = createRequire(import.meta.url);
const helmet = require("helmet") as () => express.RequestHandler;

const app = express();
const configuredOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS ?? "").split(","),
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));
const localDevelopmentOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;
const budgetNestPreviewOrigin =
  /^https:\/\/budgetnest-(?:[a-z0-9]+|web-git-[a-z0-9-]+)-dsaldariegas-projects\.vercel\.app$/;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const isAllowed =
      !origin ||
      configuredOrigins.includes(origin) ||
      localDevelopmentOrigin.test(origin) ||
      budgetNestPreviewOrigin.test(origin);
    if (isAllowed) return callback(null, true);
    return callback(null, false);
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  maxAge: 600,
}));
app.use(express.json({ limit: "1mb" }));
app.use("/api", rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
}));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "budgetnest-api" });
});

app.get("/api/me", authenticate, (_req, res) => {
  const user = res.locals.user as { id: string; email?: string };
  res.json({ user: { id: user.id, email: user.email ?? null } });
});

app.use("/api/accounts", authenticate, accountsRouter);
app.use("/api/transactions", authenticate, transactionsRouter);
app.use("/api/budgets", authenticate, budgetsRouter);
app.use("/api/goals", authenticate, goalsRouter);
app.use("/api/loans", authenticate, loansRouter);
app.use("/api/subscriptions", authenticate, subscriptionsRouter);
app.use("/api/activity", authenticate, activityRouter);
app.use("/api/settings", authenticate, settingsRouter);
app.use("/api/feedback", authenticate, feedbackRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("BudgetNest API error:", error);
  if (res.headersSent) return;
  res.status(500).json({ error: "An unexpected server error occurred." });
});

export default app;
