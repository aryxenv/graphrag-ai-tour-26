import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  allowedOrigins: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  allowedOrigins: "http://localhost:5173", // Update with actual frontend URL in production
};

export default config;
