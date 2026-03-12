import cors from "cors";
import express from "express";
import config from "./config/config";
import { errorHandler } from "./middlewares/errorHandler";
import testRoutes from "./routes/testRoutes";

const app = express();

app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Hello world" });
});

app.use("/api/test", testRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
