import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Aumenta o limite do aviso para 1500kb para evitar warnings desnecessários no deploy
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Divide bibliotecas pesadas em arquivos separados para carregar mais rápido
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion', 'date-fns'],
          genai: ['@google/genai'],
          icons: ['lucide-react']
        }
      }
    }
  }
})