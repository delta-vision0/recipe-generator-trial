// This is a Vercel Serverless Function
// Path: /api/generate-recipe.js

export default async function handler(request, response) {
  // 1. Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  // 2. Security: Get your API key from Vercel Environment Variables
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return response.status(500).send('API key is not configured in Vercel.');
  }

  // 3. Use Gemini 2.0 Flash (The newest, fastest model available)
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const { isFollowUp, ingredients, query, previousRecipe, language = 'English' } = request.body;

  let userQuery;
  let systemPrompt;

  // 4. Set up the logic for new recipes vs. modifications
  if (isFollowUp) {
    const previousRecipeJson = JSON.stringify(previousRecipe);
    userQuery = `Current Recipe: ${previousRecipeJson}. User request to modify: "${query}".`;
    systemPrompt = `You are a recipe modification assistant. Update the existing recipe based on the user's request. You must output the entire updated recipe in the exact same JSON structure. All text must be in ${language}.`;
  } else {
    userQuery = `Generate a recipe using these ingredients: ${ingredients}. If the list is empty, suggest a popular dish.`;
    systemPrompt = `You are a professional chef. Your ONLY output must be a single, valid JSON object. All string values must be in ${language}.`;
  }

  // 5. Construct the payload with Modern "JSON Mode"
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { 
      parts: [{ 
        text: `${systemPrompt} 
        Structure: {
          "recipeName": "string",
          "description": "string",
          "ingredients": ["string"],
          "instructions": ["string"]
        }` 
      }] 
    },
    generationConfig: {
      responseMimeType: "application/json" // This forces the AI to return clean JSON (no markdown backticks)
    }
  };

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API Error:", result);
      return response.status(geminiResponse.status).json(result);
    }

    // 6. Extract the generated text
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return response.status(500).send('Invalid response structure from Gemini API.');
    }

    // 7. Parse the text and send the JSON back to the frontend
    const recipeJson = JSON.parse(text);
    return response.status(200).json(recipeJson);

  } catch (error) {
    console.error('Error in serverless function:', error);
    return response.status(500).json({ 
      error: 'An internal server error occurred', 
      details: error.message 
    });
  }
}