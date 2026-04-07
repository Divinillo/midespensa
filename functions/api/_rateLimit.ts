// Shared per-user daily rate limiter backed by the Supabase rate_limits table.
// Used by the Gemini endpoints to cap daily AI usage per authenticated user
// so the free-tier Gemini quota cannot be exhausted by a single user or by
// malicious abuse. See supabase-ratelimit-migration.sql for the table schema.

interface RateLimitEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp of when the current window ends
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Check and increment the daily usage counter for a given user + scope.
 * Returns `allowed: false` if the user has reached `maxPerDay` in the last 24h.
 *
 * Fails OPEN (allows the request) if Supabase is unreachable, so rate-limit
 * infrastructure hiccups never take the whole AI pipeline down.
 */
export async function checkDailyRateLimit(
  env: RateLimitEnv,
  email: string,
  scope: string,
  maxPerDay: number,
): Promise<RateLimitResult> {
  const key = `rl:${scope}:${email}`;
  const now = Date.now();
  const fallback: RateLimitResult = {
    allowed: true,
    remaining: maxPerDay - 1,
    limit: maxPerDay,
    resetAt: new Date(now + DAY_MS).toISOString(),
  };

  const sbHeaders = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  try {
    const rlRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/rate_limits?key=eq.${encodeURIComponent(key)}&select=count,window_start&limit=1`,
      { headers: sbHeaders },
    );
    if (!rlRes.ok) return fallback;

    const rows = await rlRes.json() as Array<{ count: number; window_start: string }>;

    if (rows.length > 0) {
      const { count, window_start } = rows[0];
      const windowAge = now - new Date(window_start).getTime();

      if (windowAge < DAY_MS) {
        // Still within the 24h window
        if (count >= maxPerDay) {
          return {
            allowed: false,
            remaining: 0,
            limit: maxPerDay,
            resetAt: new Date(new Date(window_start).getTime() + DAY_MS).toISOString(),
          };
        }
        // Increment
        await fetch(
          `${env.SUPABASE_URL}/rest/v1/rate_limits?key=eq.${encodeURIComponent(key)}`,
          {
            method: 'PATCH',
            headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
            body: JSON.stringify({ count: count + 1 }),
          },
        );
        return {
          allowed: true,
          remaining: Math.max(0, maxPerDay - (count + 1)),
          limit: maxPerDay,
          resetAt: new Date(new Date(window_start).getTime() + DAY_MS).toISOString(),
        };
      }

      // Window expired — reset it
      await fetch(
        `${env.SUPABASE_URL}/rest/v1/rate_limits?key=eq.${encodeURIComponent(key)}`,
        {
          method: 'PATCH',
          headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ count: 1, window_start: new Date(now).toISOString() }),
        },
      );
      return {
        allowed: true,
        remaining: maxPerDay - 1,
        limit: maxPerDay,
        resetAt: new Date(now + DAY_MS).toISOString(),
      };
    }

    // First request ever for this key
    await fetch(`${env.SUPABASE_URL}/rest/v1/rate_limits`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ key, count: 1, window_start: new Date(now).toISOString() }),
    });
    return fallback;
  } catch {
    // Fail open — don't break the feature because the rate limiter glitched
    return fallback;
  }
}

/**
 * Build a standard JSON 429 response body for a blocked rate-limit result.
 */
export function rateLimitBlockedBody(result: RateLimitResult, endpoint: string) {
  return {
    error: 'Daily limit reached',
    message: `You have reached the daily limit of ${result.limit} ${endpoint} requests. Please try again tomorrow.`,
    limit: result.limit,
    remaining: 0,
    resetAt: result.resetAt,
  };
}
