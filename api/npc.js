/**
 * POST /api/npc
 * Generates ONE short, in-character chatter line for a Warkop Warbis customer
 * using the official Google Gemini API (gemini-2.5-flash on the v1beta REST
 * endpoint).
 *
 * Request JSON:  { "customer": "<archetypeId>", "order": "<recipeId>" }
 * Response JSON: { "ok": true, "customer", "order", "orderName", "line", "model" }
 *
 * Hard rules enforced here (server-side, authoritative):
 *   - customer + order MUST be valid IDs from the game's own data (allow-lists
 *     below). Unknown values are rejected — the AI cannot invent entities.
 *   - The order NAME is taken from ORDER_NAMES (game data), NOT from Gemini.
 *     Gemini only writes the chatter sentence; it never sets names/prices/logic.
 *   - The API key is read ONLY from process.env.GEMINI_API_KEY and sent via the
 *     x-goog-api-key header. It is never logged or returned to the client.
 *   - On any API/connection failure we return a real error (no fake AI text).
 *
 * Abuse mitigation: method guard, strict validation, input length caps,
 * output length cap, request timeout, and a lightweight in-memory per-IP rate
 * limit (best-effort on serverless; see note below).
 */

// --- Game data allow-lists (mirrors src/data; server is the source of truth) ---
const CUSTOMERS = {
  siswa: 'Siswa Buru-buru',
  bapak: 'Bapak Santai',
  ojek: 'Tukang Ojek',
  tetangga: 'Tetangga Cerewet',
  anak: 'Anak Sekolah',
  polisi: 'Pak Polisi',
  rombongan: 'Rombongan Teman'
};

const CUSTOMER_PERSONA = {
  siswa: 'anak sekolah yang buru-buru mau berangkat, bicara cepat dan singkat',
  bapak: 'bapak-bapak santai yang suka ngobrol kalem sambil ngopi',
  ojek: 'tukang ojek yang capek habis narik, ramah dan apa adanya',
  tetangga: 'ibu tetangga yang cerewet dan suka bergosip ringan',
  anak: 'anak kecil yang ceria dan suka jajan',
  polisi: 'pak polisi yang sopan dan berwibawa, lagi dinas pagi',
  rombongan: 'sekelompok teman yang nongkrong rame dan ceria'
};

// Order NAMES come from the game — Gemini must not change these.
const ORDER_NAMES = {
  kopi_hitam: 'Kopi Hitam',
  kopi_susu: 'Kopi Susu',
  teh_manis: 'Teh Manis',
  indomie: 'Indomie',
  gorengan: 'Gorengan',
  es_kopi_susu: 'Es Kopi Susu',
  teh_jahe: 'Teh Jahe'
};

// Current GA Flash model on the generativelanguage v1beta API (gemini-2.5-flash
// was retired for new API keys; Google directs new users to gemini-3.8-flash).
const MODEL = 'gemini-3.8-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_OUTPUT_CHARS = 180;
const REQUEST_TIMEOUT_MS = 9000;

// --- Best-effort in-memory rate limit (per warm instance) -------------------
// Serverless instances are ephemeral and not shared, so this is a soft guard
// against bursts hitting a single warm instance — not a global limiter. For a
// hard global limit you'd use a shared store (e.g. Upstash); out of scope now.
const RATE = { windowMs: 60_000, max: 20 };
const hits = new Map(); // ip -> { count, resetAt }

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE.windowMs });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE.max;
}

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  // Top-level safety net: any unexpected throw still returns clean JSON instead
  // of a platform 502 with an empty body.
  try {
    return await handleNpc(req, res);
  } catch (err) {
    console.error('[api/npc] unhandled error:', err && err.message ? err.message : err);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: 'Kesalahan server tak terduga.' });
    }
  }
}

async function handleNpc(req, res) {
  // 1) Method guard
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  // 2) Rate limit
  if (rateLimited(clientIp(req))) {
    res.status(429).json({ ok: false, error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
    return;
  }

  // 3) Parse + validate body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ ok: false, error: 'Body JSON tidak valid.' });
    return;
  }

  const customer = typeof body.customer === 'string' ? body.customer.trim().slice(0, 40) : '';
  const order = typeof body.order === 'string' ? body.order.trim().slice(0, 40) : '';

  if (!CUSTOMERS[customer]) {
    res.status(400).json({ ok: false, error: 'Jenis pelanggan tidak dikenal.' });
    return;
  }
  if (!ORDER_NAMES[order]) {
    res.status(400).json({ ok: false, error: 'ID pesanan tidak dikenal.' });
    return;
  }

  // 4) API key (backend-only; never exposed)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ ok: false, error: 'Konfigurasi server belum lengkap (API key tidak ada).' });
    return;
  }

  const customerName = CUSTOMERS[customer];
  const persona = CUSTOMER_PERSONA[customer];
  const orderName = ORDER_NAMES[order];

  // 5) Build a tightly-scoped prompt. Order name is fixed by us.
  const systemInstruction =
    'Kamu menulis SATU kalimat pendek dialog pelanggan di warung kopi (warkop) Indonesia. ' +
    'Gunakan bahasa Indonesia santai dan natural, boleh sedikit lucu. ' +
    'Maksimal 20 kata, satu kalimat saja, tanpa tanda kutip, tanpa emoji berlebihan. ' +
    'Jangan mengubah atau menyebut harga, jumlah koin, atau nama menu selain yang diberikan. ' +
    'Pelanggan sedang memesan menu yang namanya sudah ditentukan; cukup buat obrolan singkat yang pas.';

  const userPrompt =
    `Pelanggan: ${customerName} (${persona}). ` +
    `Dia memesan "${orderName}". ` +
    'Tuliskan satu kalimat obrolan singkat khas pelanggan ini saat memesan.';

  const payload = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 60,
      topP: 0.95
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  };

  // 6) Call Gemini with a timeout. Never fabricate output on failure.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let apiResp;
  try {
    apiResp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err && err.name === 'AbortError';
    res.status(504).json({ ok: false, error: aborted ? 'Gemini timeout.' : 'Gagal menghubungi Gemini.' });
    return;
  }
  clearTimeout(timer);

  if (!apiResp.ok) {
    // Surface a real (sanitized) error; do not leak the key or raw internals.
    let detail = '';
    try {
      const errJson = await apiResp.json();
      detail = errJson?.error?.message || '';
    } catch { /* ignore parse issues */ }
    res.status(502).json({
      ok: false,
      error: `Gemini API error (${apiResp.status}).`,
      detail: detail ? String(detail).slice(0, 200) : undefined
    });
    return;
  }

  let data;
  try {
    data = await apiResp.json();
  } catch {
    res.status(502).json({ ok: false, error: 'Respons Gemini tidak bisa dibaca.' });
    return;
  }

  // 7) Extract the text safely.
  let line = '';
  try {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) line = parts.map((p) => p?.text || '').join(' ').trim();
  } catch { /* ignore */ }

  // Guard: blocked or empty response -> real error, no fake line.
  if (!line) {
    const blockReason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    res.status(502).json({
      ok: false,
      error: 'Gemini tidak mengembalikan teks.',
      detail: blockReason ? String(blockReason).slice(0, 60) : undefined
    });
    return;
  }

  // Clean + cap output (single line, trimmed, length-limited).
  line = line.replace(/\s+/g, ' ').replace(/^["'""]+|["'""]+$/g, '').trim();
  if (line.length > MAX_OUTPUT_CHARS) line = line.slice(0, MAX_OUTPUT_CHARS).trim() + '…';

  res.status(200).json({
    ok: true,
    customer,
    order,
    orderName,      // authoritative name from game data
    line,           // AI-generated chatter only
    model: MODEL
  });
}
