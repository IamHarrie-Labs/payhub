import "dotenv/config";
import express    from "express";
import cors       from "cors";
import rateLimit  from "express-rate-limit";
import paymentsRouter from "./routes/payments.js";

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "PayHub API", version: "1.0.0" }));

app.use("/payments", paymentsRouter);

// 404 handler
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`PayHub API running on http://localhost:${PORT}`);
  const liveMode = process.env.CLEANVERSE_EMAIL && process.env.CLEANVERSE_PASSWORD;
  console.log(`Cleanverse mode: ${liveMode ? "LIVE" : "MOCK"}`);
  console.log(`Chain: ${process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"}`);
});
