const keys = {
  openrouter: [
    "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",
    "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",
    "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",
    "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"
  ],
  nvidia: [
    "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",
    "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",
    "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",
    "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"
  ]
};

async function testOpenRouter(key, i) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
    });
    const data = await res.json();
    if (res.ok) console.log(`OpenRouter Key ${i+1}: ✅ SUCCESS`);
    else console.log(`OpenRouter Key ${i+1}: ❌ ${res.status} - ${data.error?.message || 'error'}`);
  } catch (e) {
    console.log(`OpenRouter Key ${i+1}: ❌ ${e.message}`);
  }
}

async function testNvidia(key, i) {
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-ai/deepseek-v3.2", messages: [{ role: "user", content: "hi" }], max_tokens: 5 })
    });
    const data = await res.json();
    if (res.ok) console.log(`NVIDIA Key ${i+1}: ✅ SUCCESS`);
    else console.log(`NVIDIA Key ${i+1}: ❌ ${res.status} - ${data.error?.message || 'error'}`);
  } catch (e) {
    console.log(`NVIDIA Key ${i+1}: ❌ ${e.message}`);
  }
}

console.log("Testing OpenRouter keys...");
for (let i = 0; i < keys.openrouter.length; i++) {
  await testOpenRouter(keys.openrouter[i], i);
  await new Promise(r => setTimeout(r, 500));
}

console.log("\nTesting NVIDIA keys...");
for (let i = 0; i < keys.nvidia.length; i++) {
  await testNvidia(keys.nvidia[i], i);
  await new Promise(r => setTimeout(r, 500));
}
