// Simple LocalStorage wrapper to mock the "base44" behavior requested
export const db = {
  entities: {
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
        // Simple mock sort/limit
        let all = JSON.parse(localStorage.getItem('adma_progress') || '[]');
        all.sort((a: any, b: any) => b.total_chapters - a.total_chapters);
        return all.slice(0, limit);
      }
    },
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
    Commentary: {
      filter: async (query: any) => {
        const data = JSON.parse(localStorage.getItem('adma_commentary') || '[]');
        return data.filter((item: any) => item.verse_key === query.verse_key);
      },
      create: async (data: any) => {
        const all = JSON.parse(localStorage.getItem('adma_commentary') || '[]');
        const newItem = { ...data, id: Date.now().toString() };
        all.push(newItem);
        localStorage.setItem('adma_commentary', JSON.stringify(all));
        return newItem;
      },
      update: async (id: string, updates: any) => {
        const all = JSON.parse(localStorage.getItem('adma_commentary') || '[]');
        const idx = all.findIndex((i: any) => i.id === id);
        if (idx !== -1) all[idx] = { ...all[idx], ...updates };
        localStorage.setItem('adma_commentary', JSON.stringify(all));
      },
      delete: async (id: string) => {
        let all = JSON.parse(localStorage.getItem('adma_commentary') || '[]');
        all = all.filter((i: any) => i.id !== id);
        localStorage.setItem('adma_commentary', JSON.stringify(all));
      }
    },
    Dictionary: {
        filter: async (query: any) => {
          const data = JSON.parse(localStorage.getItem('adma_dictionary') || '[]');
          return data.filter((item: any) => item.verse_key === query.verse_key);
        },
        create: async (data: any) => {
          const all = JSON.parse(localStorage.getItem('adma_dictionary') || '[]');
          const newItem = { ...data, id: Date.now().toString() };
          all.push(newItem);
          localStorage.setItem('adma_dictionary', JSON.stringify(all));
          return newItem;
        },
        update: async (id: string, updates: any) => {
          const all = JSON.parse(localStorage.getItem('adma_dictionary') || '[]');
          const idx = all.findIndex((i: any) => i.id === id);
          if (idx !== -1) all[idx] = { ...all[idx], ...updates };
          localStorage.setItem('adma_dictionary', JSON.stringify(all));
        },
        delete: async (id: string) => {
          let all = JSON.parse(localStorage.getItem('adma_dictionary') || '[]');
          all = all.filter((i: any) => i.id !== id);
          localStorage.setItem('adma_dictionary', JSON.stringify(all));
        }
    },
    PanoramaBiblico: {
        filter: async (query: any) => {
            const data = JSON.parse(localStorage.getItem('adma_panorama') || '[]');
            return data.filter((item: any) => item.study_key === query.study_key);
        },
        create: async (data: any) => {
            const all = JSON.parse(localStorage.getItem('adma_panorama') || '[]');
            const newItem = { ...data, id: Date.now().toString() };
            all.push(newItem);
            localStorage.setItem('adma_panorama', JSON.stringify(all));
            return newItem;
        },
        update: async (id: string, updates: any) => {
            const all = JSON.parse(localStorage.getItem('adma_panorama') || '[]');
            const idx = all.findIndex((i: any) => i.id === id);
            if (idx !== -1) all[idx] = { ...all[idx], ...updates };
            localStorage.setItem('adma_panorama', JSON.stringify(all));
        },
        delete: async (id: string) => {
            let all = JSON.parse(localStorage.getItem('adma_panorama') || '[]');
            all = all.filter((i: any) => i.id !== id);
            localStorage.setItem('adma_panorama', JSON.stringify(all));
        }
    },
    Devotional: {
      filter: async (query: any) => {
        const data = JSON.parse(localStorage.getItem('adma_devotional') || '[]');
        return data.filter((item: any) => item.date === query.date);
      },
      create: async (data: any) => {
        const all = JSON.parse(localStorage.getItem('adma_devotional') || '[]');
        const newItem = { ...data, id: Date.now().toString() };
        all.push(newItem);
        localStorage.setItem('adma_devotional', JSON.stringify(all));
        return newItem;
      },
       delete: async (id: string) => {
            let all = JSON.parse(localStorage.getItem('adma_devotional') || '[]');
            all = all.filter((i: any) => i.id !== id);
            localStorage.setItem('adma_devotional', JSON.stringify(all));
        }
    },
    Report: {
        filter: async (query: any) => {
            // Very basic mock filter
            return [];
        },
        create: async (data: any) => {
             console.log("Report created", data);
             return { id: "123", ...data};
        }
    }
  }
};