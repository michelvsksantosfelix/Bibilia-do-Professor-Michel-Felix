import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY_API = 'adma_temp_api_key';

// --- ÁREA DE CONFIGURAÇÃO ---
// Cole sua chave aqui para que todos os usuários consigam usar o app.
// Se esta chave exceder a cota, você pode inserir uma nova pelo Painel Admin sem precisar alterar o código.
const PUBLIC_FALLBACK_KEY = "COLE_SUA_CHAVE_GOOGLE_AISTUDIO_AQUI"; 
// ----------------------------

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
  // 1. Tenta pegar a chave de emergência salva no navegador do Admin/Usuário
  const tempKey = getStoredApiKey();
  
  // 2. Ordem de preferência: 
  //    a) Chave salva no LocalStorage (Painel Admin)
  //    b) Variável de Ambiente do Vite (Vercel)
  //    c) Variável de processo (Node/Build)
  //    d) Chave fixa no código (Fallback para usuários comuns)
  let key = tempKey || 
            (import.meta as any).env?.VITE_API_KEY || 
            process.env.API_KEY || 
            PUBLIC_FALLBACK_KEY;

  // Limpeza caso a chave seja o placeholder
  if (key === "COLE_SUA_CHAVE_GOOGLE_AISTUDIO_AQUI") {
      key = "";
  }
  
  if (!key) {
    throw new Error("API Key não configurada. O Admin precisa configurar uma chave no código ou no Painel.");
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
        throw new Error("Limite da API excedido. O Admin precisa inserir uma nova chave de emergência.");
    }
    throw error;
  }
};