
import { GoogleGenAI, Type } from "@google/genai";
import { StickyNote, AppConfig } from "../types";

const getClient = (config: AppConfig) => {
  const apiKey = config.apiKey || process.env.API_KEY || '';
  if (!apiKey) throw new Error("Missing API Key. Please provide one in the settings menu (gear icon).");
  return new GoogleGenAI({ apiKey });
};

/**
 * Robustly extracts JSON from a string that might contain Markdown code blocks.
 */
function cleanJson(text: string): string {
  // Remove markdown code block wrappers if they exist
  const cleaned = text.replace(/```json\n?|```/g, "").trim();
  return cleaned;
}

const NOTE_SCHEMA = {
  type: Type.ARRAY,
  description: "A list of 3-5 top-level 'root' sticky notes. Each can have children to form a tree.",
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      title: { type: Type.STRING, description: "Short, punchy title" },
      content: { type: Type.STRING, description: "Detailed description" },
      color: { type: Type.STRING, description: "Tailwind color: bg-yellow-100, bg-blue-100, bg-green-100, bg-pink-100, bg-purple-100, bg-orange-100" },
      children: {
        type: Type.ARRAY,
        description: "Sub-points (maximum 2-3 per parent to keep total under 15)",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            color: { type: Type.STRING },
            children: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  color: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    },
    required: ["id", "title", "content", "color"]
  }
};

export async function imageToText(base64Image: string, config: AppConfig, focusObject?: string): Promise<string> {
  const ai = getClient(config);
  const focusPrompt = focusObject ? ` Specifically focus your analysis on: "${focusObject}".` : "";
  const response = await ai.models.generateContent({
    model: config.model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } },
        { text: `Describe this image in detail. Provide a professional and creative summary.${focusPrompt}` }
      ]
    }
  });
  return response.text || "No description generated.";
}

export async function imageToNotes(base64Image: string, config: AppConfig, focusObject?: string): Promise<StickyNote[]> {
  const ai = getClient(config);
  const focusPrompt = focusObject ? ` Specifically focus the hierarchy on details related to: "${focusObject}".` : "";
  const response = await ai.models.generateContent({
    model: config.model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } },
        { text: `Break this image down into a hierarchy of 10-15 sticky notes. Start with broad themes at the root, then branch into specific details.${focusPrompt} Use a variety of colors from the schema. Return ONLY JSON.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: NOTE_SCHEMA
    }
  });
  const jsonStr = cleanJson(response.text || "[]");
  return JSON.parse(jsonStr);
}

export async function textToImage(text: string, config: AppConfig): Promise<string> {
  const ai = getClient(config);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `A high-quality, professional artistic interpretation of the following text: ${text}` }]
    },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Model failed to generate an image part.");
}

export async function textToNotes(text: string, config: AppConfig): Promise<StickyNote[]> {
  const ai = getClient(config);
  const response = await ai.models.generateContent({
    model: config.model,
    contents: `Analyze this text and organize it into a hierarchical tree of sticky notes (total 10-15 notes). Top level should be major categories, sub-levels should be supporting details. Use different colors for different branches. Text: ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: NOTE_SCHEMA
    }
  });
  const jsonStr = cleanJson(response.text || "[]");
  return JSON.parse(jsonStr);
}

export async function notesToText(notes: StickyNote[], config: AppConfig): Promise<string> {
  const ai = getClient(config);
  const response = await ai.models.generateContent({
    model: config.model,
    contents: `Write a cohesive and detailed essay or article based on these hierarchical brainstorming notes: ${JSON.stringify(notes)}`
  });
  return response.text || "";
}

export async function notesToImage(notes: StickyNote[], config: AppConfig): Promise<string> {
  const ai = getClient(config);
  const prompt = `A conceptual art piece representing these organized ideas: ${JSON.stringify(notes.map(n => n.title))}`;
  return textToImage(prompt, config);
}
