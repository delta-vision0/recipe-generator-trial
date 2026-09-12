// Vercel Serverless Function
// Place this file at: /api/generate-recipe.js
//
// Your frontend calls POST /api/generate-recipe with a JSON body like:
//   { ingredients: "potato, onion, tomato", language: "Hindi" }
// or, for a follow-up edit to a recipe already shown:
//   { isFollowUp: true, query: "make it spicier", previousRecipe: {...}, language: "Marathi" }

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  const { isFollowUp, ingredients, query, previousRecipe, language } = request.body;

  // The key lives only on the server (Vercel Environment Variable) and is
  // never sent to the browser — this is the correct way to keep it private.
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return response.status(500).send('API key is not configured.');
  }

  // --- Model + endpoint -------------------------------------------------
  // gemini-3.8-flash is Google's current Flash model (as of Sep 2026).
  // NOTE: the older `?key=API_KEY` query-string auth still works on most
  // generateContent calls, but Google's current docs for gemini-3.8-flash
  // use the `x-goog-api-key` header instead — that's what's used below.
  const MODEL = 'gemini-3.8-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  // --- JSON Schema for the recipe shape ----------------------------------
  // Passing an explicit schema (instead of just `responseMimeType: "application/json"`)
  // is the current, more reliable way to force gemini-3.8-flash to return
  // exactly this structure, every time.
  const recipeResponseSchema = {
    type: "object",
    properties: {
      recipeName: { type: "string" },
      description: { type: "string" },
      ingredients: { type: "array", items: { type: "string" } },
      instructions: { type: "array", items: { type: "string" } }
    },
    required: ["recipeName", "description", "ingredients", "instructions"]
  };

  // --- Build the prompt ---------------------------------------------------
  let userQuery;
  let systemPrompt;

  if (isFollowUp) {
    const previousRecipeJson = JSON.stringify(previousRecipe);
    userQuery = `Given the following recipe JSON: ${previousRecipeJson}. Please modify it based on this request: "${query}".`;
    systemPrompt = `You are a recipe modification assistant. Take the existing recipe JSON and the user's modification request, then return a *complete, updated recipe* in the same JSON structure. All text must be in ${language}.`;
  } else {
    userQuery = `Generate a recipe using these ingredients: ${ingredients}.`;
    systemPrompt = `You are a recipe generation assistant. All string values must be in ${language}.`;
  }

  // --- Request payload ------------------------------------------------
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      // Current field name/shape for gemini-3.8-flash structured output.
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema: recipeResponseSchema
        }
      }
    }
  };

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey   // <-- current recommended auth method
      },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API Error:', geminiResponse.status, errorText);
      return response.status(geminiResponse.status).send(`Gemini API Error: ${errorText}`);
    }

    const result = await geminiResponse.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('Unexpected Gemini response shape:', JSON.stringify(result).slice(0, 500));
      return response.status(500).send('Invalid response structure from Gemini API.');
    }

    const recipeJson = JSON.parse(text);
    return response.status(200).json(recipeJson);

  } catch (error) {
    console.error('Error in serverless function:', error);
    return response.status(500).send(`An internal server error occurred: ${error.message}`);
  }
}
