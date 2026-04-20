/**
 * Cloudflare Worker — backend for the "Ask the product" widget.
 *
 * Forwards a `question` to Anthropic's API with the USERGUIDE.md loaded
 * as context. Deploy as a Worker, set ANTHROPIC_API_KEY in Worker env,
 * then set window.__bitChatBotApi = 'https://<your-worker>.workers.dev/api/chat'
 * in the live-demo page.
 *
 * Cost at typical Etsy listing traffic (~500 DMs/month): ~$2/month.
 *
 * Limits: the SYSTEM prompt tells Claude to refuse anything off-topic,
 * so this won't become a free ChatGPT for random users.
 */

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });

    const { question } = await request.json();
    if (!question || question.length > 400) {
      return new Response(JSON.stringify({ answer: 'Please ask a shorter, specific question.' }), { headers: { 'Content-Type': 'application/json', ...cors } });
    }

    // USERGUIDE.md content is embedded at deploy time; here we use a stub.
    const userGuide = `${env.USER_GUIDE_MD || 'See the full user guide in the Etsy ZIP.'}`;
    const system = `You are the customer support agent for "Mini Mission Control". You answer ONLY questions related to this product. For anything off-topic (math, coding help, weather, politics), politely redirect to product questions. Keep answers under 120 words. Be direct, helpful, and cite specific features from the user guide below when relevant.

<user_guide>
${userGuide}
</user_guide>`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: question }],
      }),
    });
    if (!res.ok) return new Response(JSON.stringify({ answer: 'I had trouble looking that up — please message through Etsy.' }), { headers: { 'Content-Type': 'application/json', ...cors } });
    const data = await res.json();
    const answer = data.content?.[0]?.text || 'No answer available.';
    return new Response(JSON.stringify({ answer }), { headers: { 'Content-Type': 'application/json', ...cors } });
  },
};
