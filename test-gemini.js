const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // Note: The SDK might not have a direct listModels, but we can try to see what's available or just guess common ones.
    // Actually, let's just try gemini-1.5-flash and gemini-1.5-pro more carefully.
    console.log("Testing gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello");
    console.log("Success with gemini-1.5-flash:", result.response.text());
  } catch (error) {
    console.error("Failed with gemini-1.5-flash:", error.message);
    
    try {
        console.log("Testing gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-pro:", result.response.text());
    } catch (e2) {
        console.error("Failed with gemini-pro:", e2.message);
    }
  }
}

listModels();
