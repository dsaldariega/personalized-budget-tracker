import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import accountsRouter from "./routes/accounts.js";
import transactionsRouter from "./routes/transactions.js";
import { authenticate } from "./middleware/authenticate.js";

const app = express();
const allowedOrigins = (process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
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

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("BudgetNest API error:", error);
  if (res.headersSent) return;
  res.status(500).json({ error: "An unexpected server error occurred." });
});

export default app;
