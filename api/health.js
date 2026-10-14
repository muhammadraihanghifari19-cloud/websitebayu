/**
 * GET /api/health
 * Simple health-check endpoint running as a Vercel Serverless Function.
 * Vercel automatically detects files in the top-level `api/` directory and
 * exposes them as routes (this file -> /api/health). No extra config needed.
 *
 * Returns: { "status": "ok", "app": "warkop-warbis" }
 */
export default function handler(req, res) {
  // Only GET is supported for a health check.
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  res.status(200).json({
    status: 'ok',
    app: 'warkop-warbis'
  });
}
