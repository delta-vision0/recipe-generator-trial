<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Generator</title>
    <!-- Tailwind CSS for styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Custom CSS for animations -->
    <style>
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
    </style>
</head>
<body class="bg-gray-50">

    <div class="font-sans text-gray-800 flex flex-col items-center p-4 sm:p-6 md:p-8">
        <div class="w-full max-w-3xl mx-auto">
            <!-- Header Section -->
            <header class="text-center mb-8">
                <h1 class="text-4xl sm:text-5xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5Z"/><path d="M12 10c-2 0-5 2-5 5v2h10v-2c0-3-3-5-5-5Z"/><path d="M20.59 13.41c.39.39.39 1.02 0 1.41l-2.59 2.59c-.39.39-1.02.39-1.41 0a1.01 1.01 0 0 1 0-1.41l2.59-2.59c.39-.39 1.02-.39 1.41 0Z"/><path d="m14 13-1-1"/><path d="m12 15-1-1"/></svg>
                    Recipe Generator
                </h1>
                <p class="text-lg text-gray-600">What do you have in your kitchen? Let's cook something up!</p>
            </header>

            <!-- Input Section -->
            <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <div class="flex flex-col gap-4">
                    <label for="ingredients-input" class="font-semibold text-gray-700">Enter your ingredients (comma separated):</label>
                    <textarea
                        id="ingredients-input"
                        placeholder="e.g., chicken breast, garlic, tomatoes, olive oil"
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200 resize-none"
                        rows="4"
                    ></textarea>
                    <button
                        id="generate-btn"
                        class="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        Generate Recipe
                    </button>
                </div>
            </div>

            <!-- Status/Result Section -->
            <div id="result-container" class="mt-8">
                <!-- Recipe, error, or loading messages will be inserted here by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        // --- DOM ELEMENT REFERENCES ---
        const ingredientsInput = document.getElementById('ingredients-input');
        const generateBtn = document.getElementById('generate-btn');
        const resultContainer = document.getElementById('result-container');

        // --- API CALL LOGIC ---
        async function generateRecipe() {
            const ingredients = ingredientsInput.value;

            if (!ingredients.trim()) {
                displayError('Please enter some ingredients.');
                return;
            }

            // --- UI UPDATE: START LOADING ---
            setLoadingState(true);
            resultContainer.innerHTML = ''; // Clear previous results

            // --- API DETAILS ---
            // WARNING: Storing API keys in client-side code is insecure for public websites.
            // This is for demonstration purposes only.
            const apiKey = "AIzaSyD6qeOpmXGSN_jsnDKScX76Qmln2sMtc58"; 
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

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

            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json" }
            };

            // --- FETCH WITH EXPONENTIAL BACKOFF ---
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
                    if (response.ok) break; // Success
                } catch (e) {
                    console.error("Fetch error:", e);
                }
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                }
            }

            // --- UI UPDATE: STOP LOADING ---
            setLoadingState(false);

            // --- HANDLE RESPONSE ---
            if (!response || !response.ok) {
                displayError('Failed to generate recipe after multiple attempts. Please try again later.');
                console.error("API request failed:", response ? await response.text() : "No response");
                return;
            }

            try {
                const result = await response.json();
                const candidate = result.candidates?.[0];
                if (candidate && candidate.content?.parts?.[0]?.text) {
                    const recipeJson = JSON.parse(candidate.content.parts[0].text);
                    displayRecipe(recipeJson);
                } else {
                    displayError('Could not parse the recipe from the response. The format might be unexpected.');
                    console.error('Unexpected API response structure:', result);
                }
            } catch (e) {
                displayError('An error occurred while parsing the recipe. Please try again.');
                console.error('Error parsing JSON:', e);
            }
        }

        // --- UI HELPER FUNCTIONS ---
        function setLoadingState(isLoading) {
            if (isLoading) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = `
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                `;
            } else {
                generateBtn.disabled = false;
                generateBtn.innerHTML = 'Generate Recipe';
            }
        }

        function displayError(message) {
            resultContainer.innerHTML = `
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                    <strong class="font-bold">Oops! </strong>
                    <span class="block sm:inline">${message}</span>
                </div>
            `;
        }

        function displayRecipe(recipe) {
            const ingredientsHtml = recipe.ingredients.map(item => `<li>${item}</li>`).join('');
            const instructionsHtml = recipe.instructions.map(step => `<li class="pl-2">${step}</li>`).join('');

            resultContainer.innerHTML = `
                <div class="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200 animate-fade-in">
                    <h2 class="text-3xl font-bold text-gray-800 mb-2">${recipe.recipeName}</h2>
                    <p class="text-gray-600 mb-6 italic">"${recipe.description}"</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="md:col-span-1">
                            <h3 class="text-xl font-semibold text-gray-700 mb-3 border-b-2 border-green-400 pb-2">Ingredients</h3>
                            <ul class="list-disc list-inside space-y-2 text-gray-700">${ingredientsHtml}</ul>
                        </div>
                        <div class="md:col-span-2">
                            <h3 class="text-xl font-semibold text-gray-700 mb-3 border-b-2 border-green-400 pb-2">Instructions</h3>
                            <ol class="list-decimal list-inside space-y-3 text-gray-700">${instructionsHtml}</ol>
                        </div>
                    </div>
                </div>
            `;
        }

        // --- EVENT LISTENERS ---
        generateBtn.addEventListener('click', generateRecipe);

    </script>
</body>
</html>