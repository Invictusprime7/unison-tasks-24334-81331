import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 4173,
    strictPort: true,
    hmr: {
      // Use WebSocket for HMR through the gateway
      clientPort: 443,
      protocol: 'wss',
    },
    watch: {
      // Watch for file changes
      usePolling: true,
      interval: 100,
    },
  },
  // Optimize for fast cold starts
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'framer-motion',
    ],
  },
});
