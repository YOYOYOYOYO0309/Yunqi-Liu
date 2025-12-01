import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult, MoistureStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSilicaGelImage = async (base64Image: string): Promise<GeminiAnalysisResult> => {
  try {
    // Remove header if present (data:image/jpeg;base64,)
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64
          }
        },
        {
          text: `Analyze this image of a silica gel packet or color changing moisture indicator. 
                 Determine if it indicates "DRY", "MIXED", or "WET" conditions based on the color.
                 Commonly: Blue/Orange is Dry. Pink/Green/Clear is Wet. A mixture of colors or a transitional color implies Mixed.
                 Return the status, a confidence score (0-100), and a short description of the color you see.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              enum: [MoistureStatus.DRY, MoistureStatus.MIXED, MoistureStatus.WET, MoistureStatus.UNKNOWN],
              description: "The moisture status based on color."
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence level of the analysis from 0 to 100."
            },
            description: {
              type: Type.STRING,
              description: "A brief description of the visual color cues."
            }
          },
          required: ["status", "confidence", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(text) as GeminiAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      status: MoistureStatus.UNKNOWN,
      confidence: 0,
      description: "Failed to analyze image. Please try again."
    };
  }
};