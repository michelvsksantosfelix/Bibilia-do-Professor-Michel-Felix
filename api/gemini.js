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
    // --- ÁREA DE SEGURANÇA ---
    // Se a variável da Vercel falhar, o sistema tentará ler a chave abaixo.
    // SUBSTITUA O TEXTO "COLE_SUA_CHAVE_AQUI_NESTE_LUGAR" PELA SUA CHAVE AIza...
    const BACKUP_KEY = "COLE_SUA_CHAVE_AQUI_NESTE_LUGAR"; 
    
    // Tenta pegar do ambiente (Vercel), se não achar, usa o backup
    const apiKey = process.env.API_KEY || BACKUP_KEY;

    // Log para debug no painel da Vercel
    if (!apiKey || apiKey === "" || apiKey === "COLE_SUA_CHAVE_AQUI_NESTE_LUGAR") {
         console.error("CRITICAL ERROR: API Key is missing.");
         return response.status(500).json({ 
             error: 'ERRO CRÍTICO: Chave de API não configurada. O Admin precisa adicionar a API_KEY nas Configurações da Vercel ou colar a chave no arquivo api/gemini.js onde indicado.' 
         });
    }

    // Tratamento robusto do body (às vezes chega como string)
    let body = request.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return response.status(400).json({ error: 'Invalid JSON body' });
        }
    }

    const { prompt, schema } = body || {};

    if (!prompt) {
        return response.status(400).json({ error: 'Prompt é obrigatório' });
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
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
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: config
    });

    return response.status(200).json({ text: aiResponse.text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return response.status(500).json({ error: error.message || 'Erro interno na IA.' });
  }
}