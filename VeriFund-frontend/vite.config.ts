import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Polyfill Node.js built-ins for browser compatibility
      // Required by Coinbase SDK dependencies (bn.js, etc.)
      buffer: 'buffer/',
      process: 'process/browser',
    },
  },
  define: {
    // Define global variables for browser environment
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Enable esbuild polyfill plugins
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    proxy: {
      // Proxy API requests to local Express server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
