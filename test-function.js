/**
 * Test Supabase Function Connectivity
 * ====================================
 * 
 * Quick script to test if fullstack-ai function is accessible
 * Run with: node test-function.js
 */

const SUPABASE_URL = "https://nfrdomdvyrbwuokathtw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcmRvbWR2eXJid3Vva2F0aHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5ODA2ODksImV4cCI6MjA1MDU1NjY4OX0.hXIS9fZcCl7IJ3j69L-vA0yAzZBWMCZqPtPqD1z2HnY";

async function testFunction() {
  console.log("Testing fullstack-ai function...\n");
  
  const url = `${SUPABASE_URL}/functions/v1/fullstack-ai`;
  
  console.log("URL:", url);
  console.log("Testing connection...\n");
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Generate a simple HTML button" }
        ],
        mode: "html",
        model: "gpt-4o-mini",
        maxTokens: 100
      })
    });
    
    console.log("Status:", response.status, response.statusText);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log("\nResponse body:");
    
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.error) {
        console.log("\n❌ ERROR:", json.error);
        console.log("Message:", json.message || "No message");
      } else if (json.html || json.content || json.code) {
        console.log("\n✅ SUCCESS! Function is working.");
      } else {
        console.log("\n⚠️ Unexpected response format");
      }
    } catch (e) {
      console.log(text);
      console.log("\n❌ Response is not valid JSON");
    }
    
  } catch (error) {
    console.log("\n❌ FAILED TO CONNECT:");
    console.log(error.message);
    console.log("\nPossible causes:");
    console.log("1. Function not deployed - run: supabase functions deploy fullstack-ai");
    console.log("2. Internet connection issues");
    console.log("3. Supabase project is offline");
    console.log("4. CORS or network restrictions");
  }
}

testFunction();
