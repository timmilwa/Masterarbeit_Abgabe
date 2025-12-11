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

export const generateSummaries = async (apiKey, history, currentSummaries) => {
    if (!apiKey) {
        // Fail silently or throw, but for background task better to just return current
        return currentSummaries;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Construct a history-based prompt
    // We can't easily use chat session for single-shot summarization without re-feeding history or using the chat object.
    // Let's just feed the whole conversation as text for this specific task to ensure context.
    const conversationText = history.map(msg => `${msg.sender}: ${msg.text}`).join('\n');

    const prompt = `
    Analysiere den folgenden Dialog und extrahiere stichpunktartig Informationen zu den drei Ebenen der Reflexion:
    1. Funktion (Was ist das Objekt, was tut es?)
    2. Emotion (Welche Gefühle sind damit verbunden?)
    3. Werte (Welche tieferen Werte oder Bedeutungen stehen dahinter?)

    Gib das Ergebnis AUSSCHLIESSLICH als valides JSON-Objekt zurück. Keine Markdown-Codeblöcke.
    Format:
    {
      "function": "- Stichpunkt 1\\n- Stichpunkt 2",
      "emotion": "- Stichpunkt 1\\n- Stichpunkt 2",
      "values": "- Stichpunkt 1\\n- Stichpunkt 2"
    }
    
    Verwende die Sprache Deutsch.
    
    Dialog:
    ${conversationText}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown code blocks if the model ignores the instruction
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Summarization error:", error);
        return currentSummaries;
    }
};
