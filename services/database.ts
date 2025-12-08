import { UserProgress, Commentary, DictionaryEntry, EBDContent, Devotional } from '../types';

// Helper para chamar a API de Storage na Vercel
const apiCall = async (action: 'list' | 'save' | 'delete', collection: string, payload: any = {}) => {
    try {
        const res = await fetch('/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, collection, ...payload })
        });
        
        if (!res.ok) {
            // Se falhar (ex: sem internet ou DB não configurado), tenta fallback local para leitura
            if (action === 'list') return JSON.parse(localStorage.getItem(`adma_${collection}`) || '[]');
            throw new Error('Falha no salvamento em nuvem');
        }
        return await res.json();
    } catch (e) {
        console.error("Cloud DB Error, using local fallback", e);
        // Fallback local silencioso para não quebrar o app
        if (action === 'list') return JSON.parse(localStorage.getItem(`adma_${collection}`) || '[]');
        return null;
    }
};

export const db = {
  entities: {
    // --- DADOS DO USUÁRIO (MANTÉM LOCAL PARA PRIVACIDADE E RAPIDEZ) ---
    ReadingProgress: {
      filter: async (query: any) => {
        const data = JSON.parse(localStorage.getItem('adma_progress') || '[]');
        return data.filter((item: any) => 
          Object.keys(query).every(key => item[key] === query[key])
        );
      },
      create: async (data: any) => {
        const all = JSON.parse(localStorage.getItem('adma_progress') || '[]');
        const newItem = { ...data, id: Date.now().toString() };
        all.push(newItem);
        localStorage.setItem('adma_progress', JSON.stringify(all));
        return newItem;
      },
      update: async (id: string, updates: any) => {
        const all = JSON.parse(localStorage.getItem('adma_progress') || '[]');
        const idx = all.findIndex((i: any) => i.id === id);
        if (idx !== -1) {
          all[idx] = { ...all[idx], ...updates };
          localStorage.setItem('adma_progress', JSON.stringify(all));
          return all[idx];
        }
        return null;
      },
      list: async (sort: string, limit: number) => {
        let all = JSON.parse(localStorage.getItem('adma_progress') || '[]');
        all.sort((a: any, b: any) => b.total_chapters - a.total_chapters);
        return all.slice(0, limit);
      }
    },

    // --- METADADOS (TÍTULOS/SUBTÍTULOS) - HÍBRIDO (Cache local + Nuvem futuramente) ---
    ChapterMetadata: {
        filter: async (query: any) => {
            const data = JSON.parse(localStorage.getItem('adma_chapter_meta') || '[]');
            return data.filter((item: any) => item.chapter_key === query.chapter_key);
        },
        create: async (data: any) => {
            const all = JSON.parse(localStorage.getItem('adma_chapter_meta') || '[]');
            const newItem = { ...data, id: Date.now().toString() };
            all.push(newItem);
            localStorage.setItem('adma_chapter_meta', JSON.stringify(all));
            return newItem;
        }
    },

    // --- CONTEÚDO COMPARTILHADO (AGORA NA NUVEM VIA VERCEL KV) ---
    Commentary: {
      filter: async (query: any) => {
        const data = await apiCall('list', 'commentary');
        return data.filter((item: any) => item.verse_key === query.verse_key);
      },
      create: async (data: any) => {
        const newItem = { ...data, id: data.id || Date.now().toString() };
        await apiCall('save', 'commentary', { item: newItem });
        return newItem;
      },
      delete: async (id: string) => {
        await apiCall('delete', 'commentary', { id });
      }
    },

    Dictionary: {
        filter: async (query: any) => {
          const data = await apiCall('list', 'dictionary');
          return data.filter((item: any) => item.verse_key === query.verse_key);
        },
        create: async (data: any) => {
          const newItem = { ...data, id: data.id || Date.now().toString() };
          await apiCall('save', 'dictionary', { item: newItem });
          return newItem;
        },
        delete: async (id: string) => {
           await apiCall('delete', 'dictionary', { id });
        }
    },

    PanoramaBiblico: {
        filter: async (query: any) => {
            const data = await apiCall('list', 'panorama');
            return data.filter((item: any) => item.study_key === query.study_key);
        },
        create: async (data: any) => {
            const newItem = { ...data, id: data.id || Date.now().toString() };
            await apiCall('save', 'panorama', { item: newItem });
            return newItem;
        },
        update: async (id: string, updates: any) => {
             // Fetch existing to merge? For now just overwrite with ID
             const newItem = { ...updates, id };
             await apiCall('save', 'panorama', { item: newItem });
             return newItem;
        },
        delete: async (id: string) => {
             await apiCall('delete', 'panorama', { id });
        }
    },

    Devotional: {
      filter: async (query: any) => {
        const data = await apiCall('list', 'devotional');
        return data.filter((item: any) => item.date === query.date);
      },
      create: async (data: any) => {
        const newItem = { ...data, id: data.id || Date.now().toString() };
        await apiCall('save', 'devotional', { item: newItem });
        return newItem;
      },
      delete: async (id: string) => {
         await apiCall('delete', 'devotional', { id });
      }
    },

    Report: {
        filter: async (query: any) => { return []; },
        create: async (data: any) => {
             // Reports can also go to cloud
             const newItem = { ...data, id: Date.now().toString() };
             await apiCall('save', 'report', { item: newItem });
             return newItem;
        }
    }
  }
};