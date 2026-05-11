import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ── Build optimizations ─────────────────────────────────────────────────────
  build: {
    target: 'es2020',          // modern browsers — smaller output than es5
    minify: 'esbuild',         // ~10x faster than terser, comparable output
    sourcemap: false,           // no sourcemaps in prod = smaller bundle
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        // Manual chunk splitting — keeps vendor chunks cached across deploys
        manualChunks: {
          'react-vendor':   ['react', 'react-dom'],
          'router':         ['react-router-dom'],
          'motion':         ['framer-motion'],
          'socket':         ['socket.io-client'],
          'forms':          ['react-hook-form', '@hookform/resolvers', 'zod'],
          'state':          ['zustand'],
          'ui':             ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // silence warnings on framer-motion
  },

  // ── Dev server ──────────────────────────────────────────────────────────────
  server: {
    warmup: {
      // Pre-transform the heaviest modules on dev server start
      clientFiles: [
        './src/features/chat/ChatLayout.tsx',
        './src/components/Sidebar.tsx',
        './src/lib/crypto.ts',
      ],
    },
  },

  // ── Dependency pre-bundling ─────────────────────────────────────────────────
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      'framer-motion', 'socket.io-client',
      'zustand', 'axios', 'lucide-react',
    ],
  },
})
