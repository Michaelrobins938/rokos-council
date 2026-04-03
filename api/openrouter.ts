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
      JSON.stringify({ error: { message: "No OpenRouter keys configured", code: 500 } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  const keyIndex = Math.floor(Math.random() * keys.length);
  const apiKey = keys[keyIndex];

  const body = await request.json();

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

  const data = await response.json();
  
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' }
  });
}
