const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log('Available Models in v1beta:');
    if (data.models) {
      data.models.forEach(m => {
        console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.log('No models found or error:', data);
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listModels();
