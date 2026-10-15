/**
 * NpcChatter
 * ----------
 * Thin client for the backend POST /api/npc endpoint. Adds OPTIONAL AI-generated
 * chatter to a customer's greeting. It never decides the order, price, recipe,
 * stock, tip, or cooking outcome — the game owns all of that. If the AI is
 * unavailable, callers simply use the existing local dialogue (fallback).
 *
 * Rate / abuse rules enforced here (frontend side):
 *   - At most ONE request per MIN_INTERVAL_MS (60s) per game session.
 *   - After a 429 (quota) we back off for QUOTA_COOLDOWN_MS and do not retry.
 *   - After any other error/timeout we back off for ERROR_COOLDOWN_MS.
 *   - No automatic retries. One attempt per call, then fall back.
 *   - A short fetch timeout so dialogue never waits on a slow network.
 *
 * Uses the relative path '/api/npc' so it works on the same Vercel domain.
 * The GEMINI_API_KEY lives only on the backend and is never touched here.
 */
const MIN_INTERVAL_MS = 60_000;    // max 1 AI request per 60s per session
const QUOTA_COOLDOWN_MS = 5 * 60_000; // after 429, rest 5 minutes
const ERROR_COOLDOWN_MS = 2 * 60_000; // after other errors, rest 2 minutes
const FETCH_TIMEOUT_MS = 7_000;

export default class NpcChatter {
  constructor() {
    this.lastRequestAt = 0;
    this.cooldownUntil = 0;
    this.inFlight = false;
    this.lastStatus = 'idle'; // 'idle' | 'ok' | 'skipped' | 'cooldown' | 'error-429' | 'error'
  }

  /** True if we're allowed to make an AI request right now. */
  canRequest(now = Date.now()) {
    if (this.inFlight) return false;
    if (now < this.cooldownUntil) return false;
    if (now - this.lastRequestAt < MIN_INTERVAL_MS) return false;
    return true;
  }

  /**
   * Try to fetch one AI chatter line for a customer+order.
   * Resolves to a string on success, or null on skip/error (caller falls back).
   * Never throws.
   */
  async fetchLine(customerId, orderId) {
    const now = Date.now();
    if (!this.canRequest(now)) {
      this.lastStatus = now < this.cooldownUntil ? 'cooldown' : 'skipped';
      return null;
    }

    this.inFlight = true;
    this.lastRequestAt = now;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const resp = await fetch('/api/npc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: customerId, order: orderId }),
        signal: controller.signal
      });

      if (resp.status === 429) {
        // Quota hit: back off for a while, do NOT retry.
        this.cooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
        this.lastStatus = 'error-429';
        return null;
      }
      if (!resp.ok) {
        // 502/503/500/etc: short cooldown, fall back to local dialogue.
        this.cooldownUntil = Date.now() + ERROR_COOLDOWN_MS;
        this.lastStatus = 'error';
        return null;
      }

      const data = await resp.json();
      if (data && data.ok && typeof data.line === 'string' && data.line.trim()) {
        this.lastStatus = 'ok';
        return data.line.trim();
      }
      // Unexpected shape -> treat as soft error.
      this.cooldownUntil = Date.now() + ERROR_COOLDOWN_MS;
      this.lastStatus = 'error';
      return null;
    } catch (e) {
      // Timeout / network error: short cooldown, no retry.
      this.cooldownUntil = Date.now() + ERROR_COOLDOWN_MS;
      this.lastStatus = 'error';
      return null;
    } finally {
      clearTimeout(timer);
      this.inFlight = false;
    }
  }
}
