import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Always use port 5001 for the backend
const backendUrl = 'http://localhost:5001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    // Comment out the CORS headers that might interfere with OAuth
    // headers: {
    //   'Cross-Origin-Embedder-Policy': 'require-corp',
    //   'Cross-Origin-Opener-Policy': 'same-origin'
    // },
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/outputs': {
        target: backendUrl,
        changeOrigin: true,
      },
      // Add proxy for Firebase auth redirects
      '/__/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
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