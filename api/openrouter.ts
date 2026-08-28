export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Use non-VITE_ keys first (VITE_ ones are corrupted with newlines in Vercel)
  const keys = [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
    process.env.VITE_OPENROUTER_API_KEY_1,
    process.env.VITE_OPENROUTER_API_KEY_2,
    process.env.VITE_OPENROUTER_API_KEY_3,
    process.env.VITE_OPENROUTER_API_KEY_4,
  ].filter((k): k is string => Boolean(k) && k.startsWith('sk-or-v1-'));
  
  if (keys.length === 0) {
    return new Response(
      JSON.stringify({ provider: 'openrouter', error: { message: 'OpenRouter provider is not configured', code: 'OPENROUTER_CONFIGURATION_ERROR', status: 500, recoverable: false } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  const keyIndex = Math.floor(Math.random() * keys.length);
  const apiKey = keys[keyIndex];

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ provider: 'openrouter', error: { message: 'Request body must be valid JSON', code: 'INVALID_REQUEST_JSON', status: 400, recoverable: false } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body || typeof body !== 'object' || typeof body.model !== 'string' || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ provider: 'openrouter', error: { message: 'Request body has an invalid schema', code: 'INVALID_REQUEST_SCHEMA', status: 400, recoverable: false } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://roko-s-council.vercel.app",
        "X-Title": "Roko's Council"
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText || '{}');
    } catch {
      return new Response(JSON.stringify({ provider: 'openrouter', model: body.model, error: { message: 'OpenRouter provider returned invalid JSON', code: 'INVALID_PROVIDER_RESPONSE', status: 502, recoverable: false } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      const hasUpstreamError = typeof data.error?.message === 'string';
      const message = hasUpstreamError ? data.error.message : 'OpenRouter provider request failed';
      return new Response(JSON.stringify({
        provider: 'openrouter',
        model: body.model,
        error: {
          message: message.replace(/sk-or-v1-[A-Za-z0-9_-]+|Bearer\s+[^\s]+/gi, '[redacted]'),
          code: typeof data.error?.code === 'string' ? data.error.code : 'OPENROUTER_PROVIDER_ERROR',
          status: response.status,
          recoverable: hasUpstreamError && [408, 425, 429, 500, 502, 503, 504].includes(response.status),
        },
      }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }

    const choice = data.choices?.[0];
    if (!choice || typeof choice.message?.content !== 'string') {
      return new Response(JSON.stringify({ provider: 'openrouter', model: body.model, error: { message: 'OpenRouter provider response has an invalid schema', code: 'INVALID_PROVIDER_RESPONSE', status: 502, recoverable: false } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      content: choice.message.content,
      provider: 'openrouter',
      model: data.model || body.model,
      requestId: data.id,
      finishReason: choice.finish_reason,
      usage: data.usage,
      serverTimestamp: data.created,
    }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ provider: 'openrouter', model: body.model, error: { message: 'OpenRouter proxy network request failed', code: 'OPENROUTER_PROXY_NETWORK_ERROR', status: 502, recoverable: true } }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
