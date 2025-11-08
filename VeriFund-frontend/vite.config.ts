import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
