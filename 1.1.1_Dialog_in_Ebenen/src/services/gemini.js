import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateResponse = async (apiKey, history, prompt, customInstructions = "") => {
    if (!apiKey) {
        throw new Error("API Key is missing");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
        history: history.map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        })),
    });

    // Prepend custom instructions to the prompt if they exist
    const fullPrompt = customInstructions
        ? `[System Instructions: ${customInstructions}]\n\n${prompt}`
        : prompt;

    const result = await chat.sendMessage(fullPrompt);
    const response = await result.response;
    return response.text();
};
