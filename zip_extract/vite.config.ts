import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react({
      jsxImportSource: undefined, // Use automatic JSX runtime
    }),
    mode === "development" && componentTagger(),
    mode === "analyze" && visualizer({
      filename: "dist/bundle-analysis.html",
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase chunk size warning limit to 1000kb for large AI/Canvas libraries
    chunkSizeWarningLimit: 1000,
    // Optimize for modern browsers
    target: 'esnext',
    rollupOptions: {
      output: {
        // Comprehensive manual chunk splitting for optimal loading
        manualChunks: (id: string) => {
          // React core and router
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-core';
          }
          
          // Heavy creative tools (loaded on demand)
          if (id.includes('fabric')) {
            return 'fabric-canvas';
          }
          if (id.includes('@monaco-editor')) {
            return 'monaco-editor';
          }
          if (id.includes('@huggingface/transformers')) {
            return 'ai-transformers';
          }
          
          // UI Component libraries
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Charts and visualization
          if (id.includes('recharts') || id.includes('html2canvas')) {
            return 'charts-viz';
          }
          
          // Backend and data fetching
          if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
            return 'backend-api';
          }
          
          // Utilities and smaller libraries
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority') || 
              id.includes('date-fns') || id.includes('nanoid') || id.includes('zod')) {
            return 'utils';
          }
          
          // Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'form-handling';
          }
          
          // Syntax highlighting and code tools - split languages separately
          if (id.includes('react-syntax-highlighter') || id.includes('prismjs')) {
            return 'syntax-highlighting';
          }
          if (id.includes('refractor/lang')) {
            return 'syntax-languages';
          }
          if (id.includes('refractor')) {
            return 'refractor-core';
          }
          
          // Animation libraries
          if (id.includes('framer-motion') || id.includes('motion')) {
            return 'animation';
          }
          
          // CodeMirror / code editor
          if (id.includes('@codemirror') || id.includes('@lezer')) {
            return 'codemirror';
          }
          
          // Markdown and rich text
          if (id.includes('marked') || id.includes('dompurify') || id.includes('turndown')) {
            return 'markdown';
          }
          
          // PDF generation
          if (id.includes('jspdf') || id.includes('html2pdf')) {
            return 'pdf-export';
          }
          
          // Image processing
          if (id.includes('heic2any') || id.includes('browser-image-compression')) {
            return 'image-processing';
          }
          
          // Embla carousel
          if (id.includes('embla-carousel')) {
            return 'carousel';
          }
          
          // React Select and similar
          if (id.includes('react-select') || id.includes('react-day-picker')) {
            return 'form-widgets';
          }
          
          // Sonner toast
          if (id.includes('sonner')) {
            return 'toast';
          }

          // Node modules vendor chunk for everything else (split by first-level package name)
          if (id.includes('node_modules')) {
            // Extract package name for more granular splitting
            const match = id.match(/node_modules\/(?:\.pnpm\/)?(@?[^/@]+(?:\/[^/@]+)?)/);
            if (match) {
              const pkgName = match[1].replace('@', '').replace('/', '-');
              // Group smaller packages together
              return `vendor-${pkgName}`;
            }
            return 'vendor';
          }
        },
      }
    },
    // Enable minification
    minify: 'esbuild',
  },
  // Optimize dependencies for better loading
  optimizeDeps: {
    include: [
      // Core libraries that should be pre-bundled
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'clsx',
      'tailwind-merge'
    ],
    exclude: [
      // Heavy libraries that should be dynamically loaded
      '@huggingface/transformers',
      'fabric',
      '@monaco-editor/react',
      'html2canvas'
    ]
  },
}));
