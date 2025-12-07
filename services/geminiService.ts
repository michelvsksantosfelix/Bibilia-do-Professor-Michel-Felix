import { GoogleGenAI, Type } from "@google/genai";

const STORAGE_KEY_API = 'adma_temp_api_key';

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(STORAGE_KEY_API);
};

export const setStoredApiKey = (key: string) => {
  localStorage.setItem(STORAGE_KEY_API, key);
};

export const clearStoredApiKey = () => {
  localStorage.removeItem(STORAGE_KEY_API);
};

const getClient = () => {
  const tempKey = getStoredApiKey();
  // Use temp key if available, otherwise default env key (which might be empty in this demo context)
  const key = tempKey || process.env.API_KEY || ""; 
  
  if (!key) {
    throw new Error("API Key não configurada. Por favor, adicione uma chave no painel Admin.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Generic generation function
export const generateContent = async (
  prompt: string, 
  jsonSchema?: any
) => {
  try {
    const ai = getClient();
    
    // Using gemini-2.5-flash as requested (free tier friendly)
    // Fallback to 2.0-flash if needed, but 2.5 is standard now
    const modelId = "gemini-2.5-flash"; 
    
    const config: any = {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    };

    if (jsonSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = jsonSchema;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: prompt }] }],
      config: config
    });

    if (jsonSchema) {
      // Clean up potential markdown code blocks if the model adds them despite MIME type
      let text = response.text || "{}";
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    }

    return response.text;

  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Handle 429 (Too Many Requests) or Quota Exceeded specifically
    if (error.message?.includes("429") || error.message?.includes("Quota") || error.status === 429) {
        throw new Error("Limite da API Gratuita excedido. Vá em Admin > Chave de Emergência e insira uma nova chave.");
    }
    throw error;
  }
};