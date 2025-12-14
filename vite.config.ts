import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the app to access process.env in some legacy contexts
    'process.env': {} 
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});