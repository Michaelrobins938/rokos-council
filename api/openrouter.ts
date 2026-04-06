import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const keys = [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
  ].filter((k): k is string => typeof k === 'string' && k.trim().startsWith('sk-or-v1-'));

  console.log(`[openrouter] keys found: ${keys.length}`);

  if (keys.length === 0) {
    return res.status(500).json({ error: { message: 'No OpenRouter keys configured', code: 500 } });
  }

  const apiKey = keys[Math.floor(Math.random() * keys.length)].trim();
  const body = req.body;

  console.log(`[openrouter] calling model: ${body?.model}`);

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sad-williams.vercel.app',
        'X-Title': "Roko's Council",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    console.log(`[openrouter] upstream status: ${upstream.status}, body: ${text.slice(0, 200)}`);

    res.setHeader('Content-Type', 'application/json');
    res.status(upstream.status);

    try {
      return res.json(JSON.parse(text));
    } catch {
      return res.send(text);
    }
  } catch (err: any) {
    console.error(`[openrouter] fetch error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
