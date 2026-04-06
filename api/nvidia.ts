import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const rawKeys = [
    process.env.NVIDIA_API_KEY,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3,
    process.env.NVIDIA_API_KEY_4,
  ];
  const keys = rawKeys.filter((k): k is string => typeof k === 'string' && k.trim().startsWith('nvapi-'));

  if (keys.length === 0) {
    const preview = rawKeys.map(k => k ? k.substring(0, 8) + '...' : 'undefined').join(', ');
    console.error(`[nvidia] NO VALID KEYS. Raw key previews: ${preview}`);
    return res.status(500).json({ error: 'No NVIDIA keys configured' });
  }

  const apiKey = keys[0].trim();
  const body = req.body;
  const model = body?.model ?? '(no model in body)';

  try {
    const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    console.log(`[nvidia] model=${model} status=${upstream.status} body=${text.slice(0, 300)}`);

    res.setHeader('Content-Type', 'application/json');
    res.status(upstream.status);
    try {
      return res.json(JSON.parse(text));
    } catch {
      return res.send(text);
    }
  } catch (err: any) {
    console.error(`[nvidia] fetch error model=${model}: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
