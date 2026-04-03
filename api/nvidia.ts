export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Use non-VITE_ keys first (VITE_ ones are corrupted with newlines in Vercel)
  const keys = [
    process.env.NVIDIA_API_KEY,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3,
    process.env.NVIDIA_API_KEY_4,
    process.env.VITE_NVIDIA_API_KEY,
    process.env.VITE_NVIDIA_API_KEY_2,
    process.env.VITE_NVIDIA_API_KEY_3,
    process.env.VITE_NVIDIA_API_KEY_4,
  ].filter((k): k is string => Boolean(k) && k.startsWith('nvapi-'));
  
  if (keys.length === 0) {
    return new Response(
      JSON.stringify({ error: { message: "No valid NVIDIA keys configured", code: 500 } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  const keyIndex = Math.floor(Math.random() * keys.length);
  const apiKey = keys[keyIndex];

  try {
    const body = await request.json();

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: { message: `NVIDIA proxy error: ${error}`, code: 500 } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
