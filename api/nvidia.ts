export const config = {
  runtime: 'edge',
};

const UPSTREAM = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Rotatable statuses: transient provider errors + auth/rate rejections where a
// different key may succeed. Everything else is surfaced as-is.
const ROTATABLE = new Set([401, 403, 408, 425, 429, 500, 502, 503, 504]);
const REDACT = /nvapi-[A-Za-z0-9_-]+|Bearer\s+[^\s]+/gi;

// Collect every configured NVIDIA key (NVIDIA_API_KEY* and VITE_* variants),
// trimmed and prefix-filtered. Duplicates are collapsed.
const collectKeys = (): string[] => {
  const names: string[] = [];
  for (let i = 1; i <= 32; i++) names.push(i === 1 ? 'NVIDIA_API_KEY' : `NVIDIA_API_KEY_${i}`);
  for (let i = 1; i <= 16; i++) names.push(i === 1 ? 'VITE_NVIDIA_API_KEY' : `VITE_NVIDIA_API_KEY_${i}`);
  return [...new Set(
    names
      .map(n => process.env[n])
      .filter((k): k is string => Boolean(k))
      .map(k => k.trim())
      .filter(k => k.startsWith('nvapi-'))
  )];
};

// Rotating start index — spreads the initial key across requests so no single
// key absorbs the whole pool's load (edge isolates re-start this counter; the
// failover loop below still covers exhaustion within a single request).
let rotateCounter = 0;

const jsonResponse = (payload: unknown, status: number, extra?: Record<string, string>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });

// Reads the upstream error body (redacted), preserving its code/message.
const upstreamError = async (upstream: Response, fallbackMessage: string) => {
  let message = fallbackMessage;
  let code: string | undefined;
  try {
    const parsed = await upstream.json();
    if (typeof parsed?.error?.message === 'string') message = parsed.error.message;
    if (typeof parsed?.error?.code === 'string') code = parsed.error.code;
  } catch { /* body not JSON */ }
  return { message: message.replace(REDACT, '[redacted]'), code };
};

// Builds the normalized non-streaming response, classifying the upstream
// payload shape so the client can distinguish real provider faults from
// model-behavior issues (reasoning-only, empty choices, prose-in-content…).
const buildNormalized = async (upstream: Response, body: any) => {
  const responseText = await upstream.text();
  let data: any;
  try {
    data = JSON.parse(responseText || '{}');
  } catch {
    return jsonResponse({ provider: 'nvidia', model: body.model, responseShape: 'non_json_body', error: { status: 502, code: 'INVALID_PROVIDER_RESPONSE', message: 'NVIDIA provider returned invalid JSON', recoverable: false } }, 502);
  }

  if (!upstream.ok) {
    const { message, code } = await upstreamError(upstream, 'NVIDIA provider request failed');
    return jsonResponse({
      provider: 'nvidia',
      model: body.model,
      responseShape: 'upstream_error',
      error: {
        status: upstream.status,
        code: code || 'NVIDIA_PROVIDER_ERROR',
        message,
        recoverable: ROTATABLE.has(upstream.status),
      },
    }, upstream.status);
  }

  const choices = Array.isArray(data.choices) ? data.choices : undefined;
  const choice = choices?.[0];
  const responseShape = !choices
    ? data.error ? 'upstream_error_200' : 'no_choices_field'
    : choices.length === 0 ? 'empty_choices'
    : typeof choice?.message?.content === 'string' ? 'ok'
    : typeof choice?.message?.reasoning_content === 'string' ? 'reasoning_only'
    : 'missing_content';

  if (responseShape !== 'ok') {
    if (responseShape === 'reasoning_only' || responseShape === 'missing_content') {
      // Model burned its budget on CoT and produced no final content. Not a
      // provider fault — return empty so the client classifies honestly.
      return jsonResponse({
        content: '',
        reasoning: typeof choice?.message?.reasoning_content === 'string' ? choice.message.reasoning_content : undefined,
        provider: 'nvidia',
        model: data.model || body.model,
        requestId: data.id,
        finishReason: choice?.finish_reason,
        usage: data.usage,
        serverTimestamp: data.created,
        responseShape,
        emptyCompletion: true,
      }, 200);
    }
    return jsonResponse({
      provider: 'nvidia',
      model: body.model,
      responseShape,
      error: {
        status: 502,
        code: 'INVALID_PROVIDER_RESPONSE',
        message: `NVIDIA provider response has an invalid schema (${responseShape})`,
        recoverable: false,
      },
    }, 502);
  }

  return jsonResponse({
    content: choice.message.content,
    provider: 'nvidia',
    model: data.model || body.model,
    requestId: data.id,
    finishReason: choice.finish_reason,
    usage: data.usage,
    serverTimestamp: data.created,
    responseShape: 'ok',
  }, upstream.status);
};

export default async function handler(request: Request) {
  const keys = collectKeys();
  if (keys.length === 0) {
    return jsonResponse({ provider: 'nvidia', error: { status: 500, code: 'NVIDIA_CONFIGURATION_ERROR', message: 'NVIDIA provider is not configured', recoverable: false } }, 500);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ provider: 'nvidia', error: { status: 400, code: 'INVALID_REQUEST_JSON', message: 'Request body must be valid JSON', recoverable: false } }, 400);
  }

  if (!body || typeof body !== 'object' || typeof body.model !== 'string' || !Array.isArray(body.messages)) {
    return jsonResponse({ provider: 'nvidia', error: { status: 400, code: 'INVALID_REQUEST_SCHEMA', message: 'Request body has an invalid schema', recoverable: false } }, 400);
  }

  const rotateStart = (rotateCounter = (rotateCounter + 1) % keys.length);
  let lastError: Response | null = null;

  // Try every key in rotation: spread start, fail over to the next key on
  // rotatable errors (429/401/403/5xx). This makes the pool self-healing so a
  // single exhausted key cannot cut the pipeline.
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = keys[(rotateStart + attempt) % keys.length];
    let upstream: Response;
    try {
      upstream = await fetch(UPSTREAM, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      lastError = jsonResponse({ provider: 'nvidia', error: { status: 502, code: 'NVIDIA_PROXY_NETWORK_ERROR', message: 'NVIDIA proxy network request failed', recoverable: true } }, 502);
      continue;
    }

    if (upstream.ok) {
      if (body.stream === true) {
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
      return await buildNormalized(upstream, body);
    }

    // Upstream rejected — build the error, then decide whether to rotate.
    const { message, code } = await upstreamError(upstream, 'NVIDIA provider request failed');
    const rotatable = ROTATABLE.has(upstream.status);
    lastError = jsonResponse({
      provider: 'nvidia',
      model: body.model,
      responseShape: 'upstream_error',
      error: {
        status: upstream.status,
        code: code || 'NVIDIA_PROVIDER_ERROR',
        message,
        recoverable: rotatable,
      },
    }, upstream.status);

    if (!rotatable) break;
    // Brief pause before trying the next key (avoids hammering a failing tier).
    await new Promise(r => setTimeout(r, 100 + attempt * 50));
  }

  // All keys in the pool were exhausted on rotatable errors — the client's own
  // backoff + cascade handles the rest.
  return lastError ?? jsonResponse({ provider: 'nvidia', error: { status: 502, code: 'NVIDIA_PROVIDER_EXHAUSTED', message: 'All NVIDIA keys were rejected', recoverable: true } }, 502);
}

