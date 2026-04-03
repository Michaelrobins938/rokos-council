export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const keys = [
    process.env.NVIDIA_API_KEY,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3,
    process.env.NVIDIA_API_KEY_4,
  ].filter((k): k is string => Boolean(k) && k.startsWith('nvapi-'));
  
  if (keys.length === 0) {
    return new Response(JSON.stringify({ error: "No NVIDIA keys" }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  const apiKey = keys[0];

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
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `NVIDIA proxy error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
