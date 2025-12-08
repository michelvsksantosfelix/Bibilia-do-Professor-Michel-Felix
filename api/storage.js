import { kv } from '@vercel/kv';

export default async function handler(request, response) {
  // CORS Setup
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    // Verifica se o KV está configurado na Vercel
    if (!process.env.KV_REST_API_URL) {
        throw new Error("Banco de dados Vercel KV não conectado/configurado.");
    }

    const { method } = request;
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

    // --- OPERAÇÃO DE LISTAGEM / FILTRO (GET) ---
    // Como estamos migrando de localStorage array, vamos simular lendo a lista inteira da chave
    // Em um app maior, usaríamos chaves individuais, mas para manter compatibilidade:
    if (method === 'POST' && body.action === 'list') {
        const { collection } = body;
        const data = await kv.get(`adma_${collection}`) || [];
        return response.status(200).json(data);
    }

    // --- OPERAÇÃO DE CRIAÇÃO / ATUALIZAÇÃO (POST) ---
    if (method === 'POST' && body.action === 'save') {
        const { collection, item } = body;
        
        // 1. Pega lista atual
        let list = await kv.get(`adma_${collection}`) || [];
        
        // 2. Verifica se é update ou create
        const index = list.findIndex(i => i.id === item.id || (item.verse_key && i.verse_key === item.verse_key) || (item.study_key && i.study_key === item.study_key));
        
        if (index >= 0) {
            list[index] = { ...list[index], ...item }; // Update
        } else {
            list.push(item); // Create
        }

        // 3. Salva lista atualizada
        await kv.set(`adma_${collection}`, list);
        return response.status(200).json({ success: true, item });
    }

    // --- OPERAÇÃO DE DELETE ---
    if (method === 'POST' && body.action === 'delete') {
        const { collection, id } = body;
        let list = await kv.get(`adma_${collection}`) || [];
        list = list.filter(i => i.id !== id);
        await kv.set(`adma_${collection}`, list);
        return response.status(200).json({ success: true });
    }

    return response.status(400).json({ error: 'Ação desconhecida' });

  } catch (error) {
    console.error("Storage Error:", error);
    // Fallback: Se der erro no banco (ex: não configurado), retorna erro para o front tratar
    return response.status(500).json({ error: error.message });
  }
}