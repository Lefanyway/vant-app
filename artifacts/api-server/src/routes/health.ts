import { Router, type IRouter } from "express";
import { redisCache } from "../lib/redis";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Whether the shared Redis cache is on, and how often it answered since the API started.
router.get("/healthz/cache", (_req, res) => {
  const redis = redisCache();
  if (!redis) return res.json({ redis: false });
  const { hits, misses, errors } = redis.stats;
  return res.json({ redis: true, hits, misses, errors, hitRate: hits + misses ? Math.round((hits / (hits + misses)) * 100) / 100 : null });
});

export default router;
