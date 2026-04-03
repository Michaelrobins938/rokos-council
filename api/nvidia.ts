export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Debug: log what env vars are available
  const allEnv = Object.keys(process.env).filter(k => 
    k.includes('NVIDIA') || k.includes('nvidia') || k.includes('API_KEY')
  );
  
  const keys = [
    process.env.VITE_NVIDIA_API_KEY,
    process.env.VITE_NVIDIA_API_KEY_2,
    process.env.VITE_NVIDIA_API_KEY_3,
    process.env.VITE_NVIDIA_API_KEY_4,
    process.env.NVIDIA_API_KEY,
    process.env.NVIDIA_API_KEY_2,
    process.env.NVIDIA_API_KEY_3,
    process.env.NVIDIA_API_KEY_4,
  ];
  
  // Debug response
  if (request.url.includes('debug')) {
    return new Response(JSON.stringify({
      foundKeys: allEnv,
      keyValues: keys.map((k, i) => ({
        index: i,
        name: ['VITE_NVIDIA_API_KEY','VITE_NVIDIA_API_KEY_2','VITE_NVIDIA_API_KEY_3','VITE_NVIDIA_API_KEY_4','NVIDIA_API_KEY','NVIDIA_API_KEY_2','NVIDIA_API_KEY_3','NVIDIA_API_KEY_4'][i],
        exists: Boolean(k),
        prefix: k ? k.substring(0, 10) : null
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const validKeys = keys.filter((k): k is string => Boolean(k));
  
  if (validKeys.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: { message: "No NVIDIA keys configured", code: 500 },
        debug: { availableEnvKeys: allEnv }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  const keyIndex = Math.floor(Math.random() * validKeys.length);
  const apiKey = validKeys[keyIndex];

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
