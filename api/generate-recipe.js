// This is a Vercel Serverless Function
// It must be placed in a file at /api/generate-recipe.js

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    const { isFollowUp, ingredients, query, previousRecipe, language } = request.body;
    
    // IMPORTANT: Your API key is stored securely as an Environment Variable on Vercel
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return response.status(500).send('API key is not configured.');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    let userQuery;
    let systemPrompt;

    if (isFollowUp) {
        const previousRecipeJson = JSON.stringify(previousRecipe);
        userQuery = `Given the following recipe JSON: ${previousRecipeJson}. Please modify it based on this request: "${query}".`;
        systemPrompt = `You are a recipe modification assistant. Your task is to take an existing recipe in JSON format and a user's modification request, then return a *complete, updated recipe* in the exact same JSON structure: {"recipeName": "string", "description": "string", "ingredients": ["string"], "instructions": ["string"]}. Your entire response must be ONLY the updated JSON object. All text must be in ${language}.`;
    } else {
        userQuery = `Generate a recipe using these ingredients: ${ingredients}.`;
        systemPrompt = `You are a recipe generation assistant. Your ONLY output must be a single, valid JSON object with this exact structure: {"recipeName": "string", "description": "string", "ingredients": ["string"], "instructions": ["string"]}. All string values inside the JSON must be in ${language}. Do not include any text, markdown, or explanations.`;
    }

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API Error:", errorText);
            return response.status(geminiResponse.status).send(`Gemini API Error: ${errorText}`);
        }

        const result = await geminiResponse.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return response.status(500).send('Invalid response structure from Gemini API.');
        }

        const recipeJson = JSON.parse(text);
        return response.status(200).json(recipeJson);

    } catch (error) {
        console.error('Error in serverless function:', error);
        return response.status(500).send(`An internal server error occurred: ${error.message}`);
    }
}

