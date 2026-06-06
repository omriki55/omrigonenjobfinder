# Anthropic API Proxy (Cloudflare Worker)

A tiny serverless proxy that lets the tracker run **live chat** without putting
your Anthropic API key in the browser. The key lives as a Cloudflare secret —
the browser only ever talks to your Worker.

```
Browser → Worker (holds ANTHROPIC_API_KEY) → Anthropic API → back
```

## Deploy (one time, free)

```bash
cd worker
npm install            # installs wrangler locally (no -g needed)
npm run login          # opens browser, authorize Cloudflare once
npm run deploy         # deploys anthropic-proxy.js
npm run set-key        # paste your sk-ant-... key when prompted
```

`wrangler deploy` prints a URL like:

```
https://anthropic-proxy.<your-subdomain>.workers.dev
```

## Connect it to the tracker

Open the tracker → ⚙️ Settings → **Connections** → paste the Worker URL into
**"Proxy URL"** → Save. That's it — every chat button now runs through the proxy.
No API key needed in the browser, and you can safely share the tracker link.

## Cost

Cloudflare Workers free tier = 100,000 requests/day. You'll pay only for the
Anthropic API usage itself (~$5–10/month for normal use).

## Hardening (optional)

To lock the proxy to your site only, uncomment `ALLOWED_ORIGIN` in
`wrangler.toml`, set it to your Pages origin, and redeploy.
