import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';


export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir:    'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor';
          }
          if (id.includes('recharts')) {
            return 'charts';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }
        }
      }
    }
  },
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  }
})