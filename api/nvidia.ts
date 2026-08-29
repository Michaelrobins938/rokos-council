export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const keys = [
    process.env.NVIDIA_API_KEY,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3,
    process.env.NVIDIA_API_KEY_4,
    process.env.VITE_NVIDIA_API_KEY,
    process.env.VITE_NVIDIA_API_KEY_1,
    process.env.VITE_NVIDIA_API_KEY_2,
    process.env.VITE_NVIDIA_API_KEY_3,
    process.env.VITE_NVIDIA_API_KEY_4,
    process.env.VITE_NVIDIA_API_KEY_5,
    process.env.VITE_NVIDIA_API_KEY_6,
    process.env.VITE_NVIDIA_API_KEY_7,
  ]
    .map(k => (typeof k === 'string' ? k.trim() : k))
    .filter((k): k is string => Boolean(k) && k.startsWith('nvapi-'));
  
  if (keys.length === 0) {
    return new Response(JSON.stringify({ provider: 'nvidia', error: { status: 500, code: 'NVIDIA_CONFIGURATION_ERROR', message: 'NVIDIA provider is not configured', recoverable: false } }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  const apiKey = keys[0];

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ provider: 'nvidia', error: { status: 400, code: 'INVALID_REQUEST_JSON', message: 'Request body must be valid JSON', recoverable: false } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body || typeof body !== 'object' || typeof body.model !== 'string' || !Array.isArray(body.messages)) {
    return new Response(JSON.stringify({ provider: 'nvidia', error: { status: 400, code: 'INVALID_REQUEST_SCHEMA', message: 'Request body has an invalid schema', recoverable: false } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Streaming passthrough: forward `stream: true` to NVIDIA NIM and pipe the
  // SSE body back to the client so the live feed can show reasoning as it flows.
  if (body.stream === true) {
    const upstream = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!upstream.ok) {
      let message = 'NVIDIA provider request failed';
      try {
        const parsed = await upstream.json();
        if (parsed?.error?.message) message = parsed.error.message;
      } catch { /* ignore */ }
      return new Response(JSON.stringify({
        provider: 'nvidia',
        model: body.model,
        error: {
          status: upstream.status,
          code: 'NVIDIA_PROVIDER_ERROR',
          message: message.replace(/nvapi-[A-Za-z0-9_-]+|Bearer\s+[^\s]+/gi, '[redacted]'),
          recoverable: [408, 425, 429, 500, 502, 503, 504].includes(upstream.status),
        },
      }), { status: upstream.status, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText || '{}');
    } catch {
      return new Response(JSON.stringify({ provider: 'nvidia', model: body.model, error: { status: 502, code: 'INVALID_PROVIDER_RESPONSE', message: 'NVIDIA provider returned invalid JSON', recoverable: false } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      const hasUpstreamError = typeof data.error?.message === 'string';
      const upstreamMessage = hasUpstreamError ? data.error.message : 'NVIDIA provider request failed';
      return new Response(JSON.stringify({
        provider: 'nvidia',
        model: body.model,
        error: {
          status: response.status,
          code: typeof data.error?.code === 'string' ? data.error.code : 'NVIDIA_PROVIDER_ERROR',
          message: upstreamMessage.replace(/nvapi-[A-Za-z0-9_-]+|Bearer\s+[^\s]+/gi, '[redacted]'),
          recoverable: hasUpstreamError && [408, 425, 429, 500, 502, 503, 504].includes(response.status),
        },
      }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }

    const choice = data.choices?.[0];
    if (!choice) {
      return new Response(JSON.stringify({ provider: 'nvidia', model: body.model, error: { status: 502, code: 'INVALID_PROVIDER_RESPONSE', message: 'NVIDIA provider response has an invalid schema', recoverable: false } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Reasoning models may return ONLY `reasoning_content` (CoT) with no final
    // `content` — typically a token-budget starvation (`finish_reason: length`).
    // That is NOT a provider schema failure: return the response with empty
    // content so the client classifies it honestly and falls back, instead of a
    // hard 502 that collapses a model-budget issue into a provider outage.
    if (typeof choice.message?.content !== 'string') {
      return new Response(JSON.stringify({
        content: '',
        reasoning: typeof choice.message?.reasoning_content === 'string' ? choice.message.reasoning_content : undefined,
        provider: 'nvidia',
        model: data.model || body.model,
        requestId: data.id,
        finishReason: choice?.finish_reason,
        usage: data.usage,
        serverTimestamp: data.created,
        emptyCompletion: true,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      content: choice?.message?.content || '',
      provider: 'nvidia',
      model: data.model || body.model,
      requestId: data.id,
      finishReason: choice?.finish_reason,
      usage: data.usage,
      serverTimestamp: data.created,
    }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(
      JSON.stringify({ provider: 'nvidia', error: { status: 502, code: 'NVIDIA_PROXY_NETWORK_ERROR', message: 'NVIDIA proxy network request failed', recoverable: true } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
