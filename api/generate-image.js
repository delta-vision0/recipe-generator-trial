// This is a Vercel Serverless Function
// It must be placed in a file at /api/generate-image.js

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    const { recipeName, description } = request.body;
    
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return response.status(500).send('API key is not configured.');
    }

    // UPDATED: Using the gemini-2.5-flash-image-preview model for better stability
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

    // A detailed prompt for high-quality food photography
    const prompt = `A delicious, professionally photographed plate of ${recipeName}, ${description}. Photorealistic, food photography style, bright lighting, appetizing, high detail.`;

    // UPDATED: Payload structure for the generateContent API
    const payload = {
      contents: [{
          parts: [{ text: prompt }]
      }],
      generationConfig: {
          responseModalities: ['IMAGE']
      },
    };

    try {
        const imageGenResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!imageGenResponse.ok) {
            const errorText = await imageGenResponse.text();
            console.error("Image Gen API Error:", errorText);
            return response.status(imageGenResponse.status).send(`Image Gen API Error: ${errorText}`);
        }

        const result = await imageGenResponse.json();
        
        // UPDATED: Parsing logic for the new response structure
        const base64Image = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (!base64Image) {
            console.error("Invalid image response structure:", result);
            return response.status(500).send('Invalid image response structure from API.');
        }

        // Send the base64 data back to the frontend
        return response.status(200).json({ base64Image: base64Image });

    } catch (error) {
        console.error('Error in image generation function:', error);
        return response.status(500).send(`An internal server error occurred: ${error.message}`);
    }
}

