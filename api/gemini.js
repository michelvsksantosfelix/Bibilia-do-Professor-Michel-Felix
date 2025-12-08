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
    const apiKey = process.env.API_KEY;

    // Log para debug no painel da Vercel
    if (!apiKey) {
         console.error("CRITICAL ERROR: 'API_KEY' environment variable is missing.");
         return response.status(500).json({ 
             error: 'Configuração Incompleta: API KEY não encontrada nas variáveis de ambiente da Vercel.' 
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