import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev: `npm run dev` (vite :5173) proxies /api to the study server on :4173.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // CSP is font-src 'self', so never inline fonts as data: URIs.
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:4173' },
  },
});
