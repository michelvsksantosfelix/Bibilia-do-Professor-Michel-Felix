import { GoogleGenAI } from "@google/genai";

export default async function handler(request, response) {
  // Configuração de CORS
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Tenta pegar a chave das variáveis de ambiente da Vercel
    const apiKey = process.env.API_KEY || process.env.VITE_API_KEY;

    // Se a chave não existir nas variáveis de ambiente, retorna erro claro
    if (!apiKey || apiKey.includes("COLE_SUA_CHAVE")) {
         console.error("ERRO CRÍTICO: API Key não encontrada nas Variáveis de Ambiente da Vercel.");
         return response.status(500).json({ 
             error: 'Configuração ausente: Adicione a variável API_KEY nas configurações do projeto na Vercel (Settings > Environment Variables).' 
         });
    }

    const { prompt, schema } = request.body;
    
    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-2.5-flash";
    
    const config = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
    };

    if (schema) {
        config.responseMimeType = "application/json";
        config.responseSchema = schema;
    }

    const aiResponse = await ai.models.generateContent({
        model: modelId,
        contents: [{ parts: [{ text: prompt }] }],
        config: config
    });

    return response.status(200).json({ text: aiResponse.text });

  } catch (error) {
    console.error("Erro no Servidor Gemini:", error);
    return response.status(500).json({ error: error.message || 'Erro interno no servidor de IA' });
  }
}