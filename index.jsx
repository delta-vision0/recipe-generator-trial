import React, { useState } from 'react';

// Main App Component
export default function App() {
    // --- STATE MANAGEMENT ---
    const [ingredients, setIngredients] = useState('');
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- API CALL ---
    const generateRecipe = async () => {
        if (!ingredients.trim()) {
            setError('Please enter some ingredients.');
            return;
        }

        setLoading(true);
        setError(null);
        setRecipe(null);

        // System instruction to guide the model's behavior and response format
        const systemPrompt = `
            You are a creative chef who specializes in making delicious recipes from a limited set of ingredients.
            Your task is to generate a recipe based on the ingredients provided by the user.
            You can suggest common pantry staples (like oil, salt, pepper, water) to complete the dish if necessary.

            Your response MUST be a valid JSON object with the following structure:
            {
              "recipeName": "string",
              "description": "string",
              "ingredients": ["string"],
              "instructions": ["string"]
            }
            Do not include any text or formatting outside of this JSON object.
        `;
        
        const userQuery = `Generate a recipe using the following ingredients: ${ingredients}`;
        const apiKey = "AIzaSyD6qeOpmXGSN_jsnDKScX76Qmln2sMtc58"; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                responseMimeType: "application/json",
            }
        };

        // Exponential backoff for retries
        let response;
        let retries = 3;
        let delay = 1000;
        for (let i = 0; i < retries; i++) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    break; // Success
                }

            } catch (e) {
                console.error("Fetch error:", e);
            }
            
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
        
        setLoading(false);

        if (!response || !response.ok) {
            setError('Failed to generate recipe after multiple attempts. Please try again later.');
            console.error("API request failed:", response ? await response.text() : "No response");
            return;
        }

        try {
            const result = await response.json();
            const candidate = result.candidates?.[0];
            if (candidate && candidate.content?.parts?.[0]?.text) {
                const recipeJson = JSON.parse(candidate.content.parts[0].text);
                setRecipe(recipeJson);
            } else {
                setError('Could not parse the recipe from the response. The format might be unexpected.');
                console.error('Unexpected API response structure:', result);
            }
        } catch (e) {
            setError('An error occurred while parsing the recipe. Please try again.');
            console.error('Error parsing JSON:', e);
        }
    };

    // --- RENDER ---
    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800 flex flex-col items-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-3xl mx-auto">
                {/* Header Section */}
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5Z"/><path d="M12 10c-2 0-5 2-5 5v2h10v-2c0-3-3-5-5-5Z"/><path d="M20.59 13.41c.39.39.39 1.02 0 1.41l-2.59 2.59c-.39.39-1.02.39-1.41 0a1.01 1.01 0 0 1 0-1.41l2.59-2.59c.39-.39 1.02-.39 1.41 0Z"/><path d="m14 13-1-1"/><path d="m12 15-1-1"/></svg>
                        Recipe Generator
                    </h1>
                    <p className="text-lg text-gray-600">What do you have in your kitchen? Let's cook something up!</p>
                </header>

                {/* Input Section */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex flex-col gap-4">
                        <label htmlFor="ingredients" className="font-semibold text-gray-700">Enter your ingredients (comma separated):</label>
                        <textarea
                            id="ingredients"
                            value={ingredients}
                            onChange={(e) => setIngredients(e.target.value)}
                            placeholder="e.g., chicken breast, garlic, tomatoes, olive oil"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 resize-none"
                            rows="4"
                        />
                        <button
                            onClick={generateRecipe}
                            disabled={loading}
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </>
                            ) : (
                                "Generate Recipe"
                            )}
                        </button>
                    </div>
                </div>

                {/* Status/Result Section */}
                <div className="mt-8">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                            <strong className="font-bold">Oops! </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    
                    {recipe && (
                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 animate-fade-in">
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">{recipe.recipeName}</h2>
                            <p className="text-gray-600 mb-6 italic">"{recipe.description}"</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b-2 border-green-400 pb-2">Ingredients</h3>
                                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                                        {recipe.ingredients.map((item, index) => (
                                            <li key={index}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="md:col-span-2">
                                    <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b-2 border-green-400 pb-2">Instructions</h3>
                                    <ol className="list-decimal list-inside space-y-3 text-gray-700">
                                        {recipe.instructions.map((step, index) => (
                                            <li key={index} className="pl-2">{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Simple CSS for fade-in animation
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fadeIn 0.5s ease-out forwards;
    }
`;
document.head.appendChild(style);

