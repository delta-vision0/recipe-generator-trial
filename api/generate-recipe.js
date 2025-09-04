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

    // Using the Imagen 3 model endpoint for image generation
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    // A detailed prompt for high-quality food photography
    const prompt = `A delicious, professionally photographed plate of ${recipeName}, ${description}. Photorealistic, food photography style, bright lighting, appetizing, high detail.`;

    const payload = {
      instances: [{ prompt: prompt }],
      parameters: { "sampleCount": 1 }
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
        const base64Image = result.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Image) {
            return response.status(500).send('Invalid image response structure from API.');
        }

        // Send the base64 data back to the frontend
        return response.status(200).json({ base64Image: base64Image });

    } catch (error) {
        console.error('Error in image generation function:', error);
        return response.status(500).send(`An internal server error occurred: ${error.message}`);
    }
}
