/**
 * Anthropic API proxy — Cloudflare Worker
 * ----------------------------------------
 * Keeps your ANTHROPIC_API_KEY secret (server-side) so the tracker can run
 * live chat WITHOUT exposing the key in the browser.
 *
 * Deploy (one time, ~10 min, free tier):
 *   1. npm i -g wrangler && wrangler login
 *   2. cd worker && wrangler deploy
 *   3. wrangler secret put ANTHROPIC_API_KEY   (paste sk-ant-...)
 *   4. Copy the deployed URL (e.g. https://anthropic-proxy.<you>.workers.dev)
 *      and paste it into the tracker → Settings → Connections → "Proxy URL".
 *
 * Optional hardening: set ALLOWED_ORIGIN to your Pages URL to lock down CORS.
 */

const MODEL_ALLOWLIST = new Set([
  "claude-sonnet-4-6",
  "claude-opus-4-8",
  "claude-haiku-4-5-20251001",
]);

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST")
      return json({ error: "Method not allowed" }, 405, cors);

    if (!env.ANTHROPIC_API_KEY)
      return json({ error: "Server missing ANTHROPIC_API_KEY secret" }, 500, cors);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }

    // Allowlist the payload — never forward arbitrary fields.
    const model = MODEL_ALLOWLIST.has(body.model) ? body.model : "claude-sonnet-4-6";
    const payload = {
      model,
      max_tokens: Math.min(Math.max(body.max_tokens || 2000, 256), 4000),
      messages: Array.isArray(body.messages) ? body.messages : [],
    };
    if (typeof body.system === "string" && body.system) payload.system = body.system;

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...cors, "content-type": "application/json" },
    });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
