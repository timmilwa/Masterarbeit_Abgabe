
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeImageElement = async (
  imageDataBase64: string,
  focusArea: string,
  modelName: string = "gemini-3-flash-preview",
  customApiKey?: string
): Promise<AnalysisResult> => {
  const apiKey = customApiKey || process.env.API_KEY || "";
  if (!apiKey) throw new Error("API Key is missing. Please check settings.");

  const ai = new GoogleGenAI({ apiKey });
  const model = ai.models.generateContent({
    model: modelName,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageDataBase64.split(",")[1],
            },
          },
          {
            text: `Analyze the following user interface image. Use "${focusArea}" as the primary focus area or context for your analysis.
            
            Instead of just analyzing the whole area, identify specific, individual design elements (e.g., buttons, icons, layout sections, color choices, typography) within or related to this focus that are noteworthy from a UX perspective.
            
            For each specific element you identify:
            1. Determine its precise location and provide a bounding box [ymin, xmin, ymax, xmax] (coordinates 0-1000).
            2. Apply the Means-End Chain theory:
               - Attributes: The literal visual/functional features (e.g., "Rounded corners", "Vibrant blue color").
               - Consequences: What it does for the user or how it makes them feel (e.g., "Feels friendly/approachable", "Creates visual hierarchy").
               - Values: The deep-seated human values it taps into (e.g., "Security", "Self-expression", "Belonging").
            
            Provide a detailed description of why you chose this specific element. Return multiple chains if relevant.

            Return the response in JSON format.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chains: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                boundingBox: {
                  type: Type.OBJECT,
                  properties: {
                    ymin: { type: Type.NUMBER },
                    xmin: { type: Type.NUMBER },
                    ymax: { type: Type.NUMBER },
                    xmax: { type: Type.NUMBER },
                  },
                  required: ["ymin", "xmin", "ymax", "xmax"],
                },
                attributes: { type: Type.ARRAY, items: { type: Type.STRING } },
                consequences: { type: Type.ARRAY, items: { type: Type.STRING } },
                values: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING },
              },
              required: ["id", "label", "boundingBox", "attributes", "consequences", "values"],
            },
          },
        },
      },
    },
  });

  const response = await model;
  const text = response.text;
  if (!text) throw new Error("No analysis received from AI.");
  return JSON.parse(text) as AnalysisResult;
};
