import { GoogleGenAI, Type } from "@google/genai";
import { AiData } from "../types";

const SYSTEM_INSTRUCTION = `You are an SEO expert and sales specialist for tourist equipment on Avito (Russian marketplace). 
Analyze the image provided.
1) Write a selling title (title, max 50 chars).
2) Write a short SEO-optimized description for the alt-tag (alt_text, max 100 chars, describe exactly what is in the photo using keywords, transliterated friendly).
3) Write a detailed selling description (description, with emojis and a list of benefits).
4) Estimate the price in RUB (price_guess).
Return ONLY valid JSON.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    alt_text: { type: Type.STRING },
    description: { type: Type.STRING },
    price_guess: { type: Type.STRING },
  },
  required: ["title", "alt_text", "description", "price_guess"],
};

export const generateGeminiDescription = async (imageUrl: string): Promise<AiData> => {
  // Use process.env.API_KEY directly when initializing the client
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Fetch blob from local blob URL
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Convert to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data url prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // We treat processed images as generic image data, JPEG/WebP handled by model
              data: base64Data
            }
          },
          {
            text: "Analyze this image for an Avito listing."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    if (!aiResponse.text) {
      throw new Error("No response text from Gemini");
    }

    return JSON.parse(aiResponse.text) as AiData;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};