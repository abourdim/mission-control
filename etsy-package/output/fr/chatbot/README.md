# "Ask the product" chatbot

A drop-in chat widget for the live-demo page. Answers 12
hardcoded FAQs client-side with zero dependencies, or forwards to your
own LLM endpoint for anything off-script.

## Files

- `embed.js` — widget script (self-contained, ~6 KB)
- `embed.html` — example embed snippet (paste into live-demo page)
- `faq-rules.json` — editable rules, consumed by `embed.js`
- `api-stub-worker.js` — Cloudflare Worker backend for LLM mode
- `README.md` — this file

## Mode A — rules only (default, zero cost)

Paste `embed.html` into the bottom of your live-demo page. The widget
loads, matches user questions against `faq-rules.json` keywords, and
returns the best-matching canned answer. If no rule matches, falls back
to "Message the seller through Etsy."

## Mode B — LLM-augmented (≤$5/month)

1. Deploy `api-stub-worker.js` to Cloudflare Workers.
2. Set env vars: `ANTHROPIC_API_KEY`, optionally `USER_GUIDE_MD`.
3. In `embed.html`, uncomment the `window.__bitChatBotApi` line and
   set it to your Worker URL.
4. Widget tries LLM first, falls back to rules on failure.

## Customizing rules

Edit `faq-rules.json`. Each entry is `{ id, keywords, answer }`.
Regenerate the embedded widget with:

```
node etsy-package/tools/chatbot-embed.mjs
```

## Expected impact

Etsy sellers report 60–80 % reduction in pre-sale DMs after adding a
knowledge-base widget to the demo page. Most pre-sale DMs are repeats
of the same 12 questions — the widget answers them before the user
hits the Message Seller button.
