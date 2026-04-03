// Test script to verify all API keys are working - no dependencies
import { readFileSync } from 'fs';

// Parse .env file manually
const envContent = readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    env[key.trim()] = valueParts.join('=').trim();
  }
}

const testOpenRouter = async (key, index) => {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Roko's Council Test"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1:free",
        messages: [{ role: "user", content: "Say OK in 2 words." }],
        temperature: 0.1,
        max_tokens: 10
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log(`✅ OpenRouter Key ${index}: OK (response: "${content.trim().substring(0, 30)}")`);
      return true;
    } else {
      const err = await res.text();
      console.log(`❌ OpenRouter Key ${index}: FAILED (${res.status}) ${err.substring(0, 100)}`);
      return false;
    }
  } catch (e) {
    console.log(`❌ OpenRouter Key ${index}: ERROR - ${e.message}`);
    return false;
  }
};

const testNvidia = async (key, index, model) => {
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Say OK" }],
        temperature: 0.1,
        max_tokens: 10
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log(`✅ NVIDIA Key ${index} (${model}): OK (response: "${content.trim().substring(0, 30)}")`);
      return true;
    } else {
      const err = await res.text();
      console.log(`❌ NVIDIA Key ${index} (${model}): FAILED (${res.status}) ${err.substring(0, 100)}`);
      return false;
    }
  } catch (e) {
    console.log(`❌ NVIDIA Key ${index} (${model}): ERROR - ${e.message}`);
    return false;
  }
};

const testGemini = async (key) => {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say OK" }] }]
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log(`✅ Gemini Key: OK (response: "${content.trim().substring(0, 30)}")`);
      return true;
    } else {
      const err = await res.text();
      console.log(`❌ Gemini Key: FAILED (${res.status}) ${err.substring(0, 100)}`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Gemini Key: ERROR - ${e.message}`);
    return false;
  }
};

console.log("\n🔍 Testing API Keys...\n");

const results = { openrouter: [], nvidia: [], gemini: null };

// Test OpenRouter keys
for (let i = 1; i <= 4; i++) {
  const key = env[`OPENROUTER_API_KEY_${i}`];
  if (key) {
    results.openrouter.push(await testOpenRouter(key, i));
  } else {
    console.log(`⚠️  OpenRouter Key ${i}: NOT FOUND`);
  }
}

console.log("\n");

// Test NVIDIA keys
const nvidiaModels = ["nvidia/seed-oss-36b", "nvidia/glm-5", "nvidia/deepseek-v3.2", "nvidia/boltz-2"];
for (let i = 1; i <= 4; i++) {
  const key = env[`NVIDIA_API_KEY${i > 1 ? '_' + i : ''}`];
  if (key) {
    const model = nvidiaModels[i - 1];
    results.nvidia.push(await testNvidia(key, i, model));
  } else {
    console.log(`⚠️  NVIDIA Key ${i}: NOT FOUND`);
  }
}

console.log("\n");

// Test Gemini key
if (env.GEMINI_API_KEY) {
  results.gemini = await testGemini(env.GEMINI_API_KEY);
} else {
  console.log("⚠️  Gemini Key: NOT FOUND");
}

console.log("\n📊 Summary:");
console.log(`  OpenRouter: ${results.openrouter.filter(Boolean).length}/${results.openrouter.length} working`);
console.log(`  NVIDIA: ${results.nvidia.filter(Boolean).length}/${results.nvidia.length} working`);
console.log(`  Gemini: ${results.gemini ? 'working' : 'failed/missing'}`);

const totalWorking = results.openrouter.filter(Boolean).length + results.nvidia.filter(Boolean).length + (results.gemini ? 1 : 0);
const total = results.openrouter.length + results.nvidia.length + 1;
console.log(`\n${totalWorking}/${total} endpoints operational\n`);

process.exit(totalWorking > 0 ? 0 : 1);
