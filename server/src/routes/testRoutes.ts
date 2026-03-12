import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

/**
 * GET /api/test
 * returns test from routes
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    res.status(200).json({ message: "hello world" });
  } catch (err) {
    console.error("Error testing:", err);
    res.status(500).json({ message: "Failed test" });
  }
});

export default router;
