import { GoogleGenAI, Chat, GenerateContentResponse, Part, Content } from "@google/genai";
import { ReflectionLevel, ImageFile } from "../types";

const MODEL_NAME = "gemini-2.5-flash";

let chatSession: Chat | null = null;
let aiInstance: GoogleGenAI | null = null;

export const resetAI = () => {
  aiInstance = null;
  chatSession = null;
};

const getAI = (): GoogleGenAI => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

// Timeout helper
const withTimeout = <T>(promise: Promise<T>, ms: number = 60000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Zeitüberschreitung bei der Anfrage (Timeout).")), ms)
    )
  ]);
};

export const initializeChat = async (
  image: ImageFile,
  objectName: string,
  initialLevel: ReflectionLevel
): Promise<string> => {
  const ai = getAI();
  
  const systemInstruction = `
    Du bist ein Design-Forscher. Ein Nutzer hat ein Bild eines Objekts ("${objectName}") hochgeladen.

    DEINE MISSION:
    Untersuche das Objekt auf der Ebene: "${initialLevel}".
    
    WICHTIG - DEIN FRAGE-STIL:
    1. **KEINE EINZELDETAILS**: Frag NICHT nach "diesem einen Knopf" oder "jener Schraube".
    2. **THEMENFELDER**: Suche nach *Mustern* oder *Konzepten* (z.B. "Interaktivität", "Stabilität", "Eleganz", "Verarbeitung").
    3. **MULTIPLE ANTWORTEN**: Formuliere deine Frage so, dass der Nutzer *mehrere* Stellen im Bild markieren kann.
       - Gut: "Wo überall im Bild entdeckst du Hinweise auf eine industrielle Fertigung?"
       - Gut: "Welche verschiedenen Elemente tragen zur freundlichen Ausstrahlung bei?"
       - Schlecht: "Was ist das für ein Material am Griff?"

    REGELN:
    - Bleib strikt auf der Ebene "${initialLevel}".
    - Wenn der Nutzer antwortet, wird er dir wahrscheinlich eine LISTE von Beobachtungen schicken. Fasse diese zusammen und leite zum nächsten Thema über.
  `;

  const parts: Part[] = [
    {
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    },
    {
      text: `Das Objekt ist: "${objectName}".
      Wir starten auf der Ebene: "${initialLevel}".
      
      AUFGABE:
      1. Analysiere das Bild global.
      2. Wähle ein spannendes Thema passend zu "${initialLevel}".
      3. Stelle eine offene Frage: "Wo überall siehst du [Thema]?"`
    }
  ];

  try {
    const initialResponse = await withTimeout<GenerateContentResponse>(
      ai.models.generateContent({
        model: MODEL_NAME,
        config: { systemInstruction },
        contents: { parts: parts }
      })
    );

    const initialText = initialResponse.text || "Ich bin bereit.";

    const history: Content[] = [
      {
        role: 'user',
        parts: parts
      },
      {
        role: 'model',
        parts: [{ text: initialText }]
      }
    ];

    chatSession = ai.chats.create({
      model: MODEL_NAME,
      config: { systemInstruction },
      history: history
    });

    return initialText;

  } catch (error) {
    console.error("Gemini API Error details:", error);
    throw error;
  }
};

export const sendMessageToChat = async (message: string): Promise<string> => {
  if (!chatSession) throw new Error("Chat not initialized");
  
  try {
    const response = await withTimeout<GenerateContentResponse>(chatSession.sendMessage({ message }));
    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error details:", error);
    throw error;
  }
};

export const switchLevelInChat = async (newLevel: ReflectionLevel): Promise<string> => {
  if (!chatSession) throw new Error("Chat not initialized");
  
  const prompt = `[SYSTEM-BEFEHL]: Wir wechseln zur Ebene "${newLevel}".
  
  ANWEISUNG:
  1. Suche ein NEUES Ober-Thema, das zu "${newLevel}" passt.
  2. Stelle eine Frage, die den Nutzer dazu auffordert, verschiedene Bereiche im Bild zu markieren, die dieses Thema verkörpern.`;

  try {
    const response = await withTimeout<GenerateContentResponse>(chatSession.sendMessage({
      message: prompt
    }));
    
    return response.text || `Zu ${newLevel} gewechselt.`;
  } catch (error) {
    console.error("Gemini API Error details:", error);
    throw error;
  }
};