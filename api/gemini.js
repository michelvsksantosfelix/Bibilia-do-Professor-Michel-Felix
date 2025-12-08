import { GoogleGenAI } from "@google/genai";

export default async function handler(request, response) {
  // Configuração de CORS para permitir que seu frontend fale com esse backend
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responde rápido para requisições OPTIONS (pre-flight do navegador)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Apenas aceita POST
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Tenta pegar a chave da variável de ambiente segura (Vercel)
    // process.env.API_KEY é o padrão onde salvamos no painel da Vercel
    const apiKey = process.env.API_KEY;

    // 2. Validação de segurança
    if (!apiKey) {
         console.error("ERRO CRÍTICO: API Key não encontrada nas Variáveis de Ambiente.");
         return response.status(500).json({ 
             error: 'Erro de Configuração no Servidor: Chave de API não encontrada. Verifique as Variáveis de Ambiente na Vercel.' 
         });
    }

    const { prompt, schema } = request.body;

    if (!prompt) {
        return response.status(400).json({ error: 'Prompt é obrigatório' });
    }
    
    // 3. Inicializa o Gemini
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

    // 4. Chama o modelo
    const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: config
    });

    // 5. Retorna o texto gerado
    return response.status(200).json({ text: aiResponse.text });

  } catch (error) {
    console.error("Erro no Servidor Gemini:", error);
    // Retorna erro amigável para o frontend
    return response.status(500).json({ error: error.message || 'Erro interno ao processar inteligência artificial.' });
  }
}