import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/**
 * Rate limits a given key (for example, a wallet address) by recording
 * the current timestamp in a sorted set and ensuring the number of entries
 * within a time window does not exceed the allowed threshold.
 *
 * @param userKey - Unique key to identify the user (e.g., wallet address)
 * @param threshold - Maximum allowed requests within the time window
 * @param windowMs - Time window in milliseconds (e.g., 30000 for 30 seconds)
 * @throws Error if rate limit is exceeded
 */
export async function rateLimit(
  userKey: string,
  threshold: number,
  windowMs: number,
): Promise<void> {
  const key = `rps:rate-limit:${userKey}`;
  const now = Date.now();

  await redis.zadd(key, { score: now, member: now.toString() });
  await redis.zremrangebyscore(key, 0, now - windowMs);
  const count = await redis.zcount(key, now - windowMs, now);

  if (count > threshold) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
}
