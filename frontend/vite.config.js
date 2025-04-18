import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Always use port 5001 for the backend
const backendUrl = 'http://localhost:5001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/outputs': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  define: {
    'process.env.APP_NAME': JSON.stringify('KuraFlix'),
  }
}); 