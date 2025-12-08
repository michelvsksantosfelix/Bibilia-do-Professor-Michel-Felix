import { GoogleGenAI } from "@google/genai";

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

// Função unificada de geração
export const generateContent = async (
  prompt: string, 
  jsonSchema?: any
) => {
  try {
    // 1. Tenta usar chave do Admin salva localmente (Modo Admin com chave própria)
    const adminKey = getStoredApiKey();
    
    if (adminKey) {
        // --- MODO CLIENT-SIDE (Apenas para o Admin que inseriu sua própria chave) ---
        const ai = new GoogleGenAI({ apiKey: adminKey });
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
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: config
        });
        
        return processResponse(response.text, jsonSchema);
    } 
    
    // 2. --- MODO SERVER-SIDE (Usuários Comuns - Seguro) ---
    // Chama a API da Vercel para esconder a chave
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: prompt,
            schema: jsonSchema
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        
        // Mensagem específica se faltar a chave no servidor
        if (response.status === 500 && (errData.error?.includes('API KEY') || errData.error?.includes('Configuração'))) {
             throw new Error("ERRO DE CONFIGURAÇÃO: O Admin precisa adicionar a 'API_KEY' nas Variáveis de Ambiente da Vercel.");
        }

        throw new Error(errData.error || `Erro no servidor: ${response.status}`);
    }

    const data = await response.json();
    return processResponse(data.text, jsonSchema);

  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("429") || error.message?.includes("Quota")) {
        throw new Error("Limite da API excedido. Tente novamente mais tarde.");
    }
    throw error;
  }
};

// Helper para processar o JSON/Texto
function processResponse(text: string | undefined, jsonSchema: any) {
    if (jsonSchema) {
      let cleanText = text || "{}";
      cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText);
    }
    return text;
}