#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * Test OpenAI API Key Validity
 * Quickly verifies if an OpenAI API key is valid by making a minimal request
 */

const apiKey = Deno.env.get("OPENAI_API_KEY");

if (!apiKey) {
  console.error("❌ OPENAI_API_KEY environment variable not set");
  Deno.exit(1);
}

console.log("Testing OpenAI API key validity...");
console.log(`Key format: ${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 5)}`);

try {
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "test-script/1.0",
    },
  });

  console.log(`\nResponse Status: ${response.status} ${response.statusText}`);

  if (response.ok) {
    console.log("✅ API key is VALID");
    const data = await response.json();
    console.log(`Available models: ${(data.data || []).slice(0, 3).map((m: any) => m.id).join(", ")}...`);
  } else {
    console.log("❌ API key is INVALID or has insufficient permissions");
    const errorData = await response.json();
    console.log(`Error: ${JSON.stringify(errorData, null, 2)}`);
  }
} catch (error) {
  console.error("❌ Network error:", error instanceof Error ? error.message : error);
  Deno.exit(1);
}
