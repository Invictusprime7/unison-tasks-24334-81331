import { useState, useCallback, useMemo } from 'react';

export interface VirtualFile {
  id: string;
  name: string;
  content: string;
  type: 'file';
  language: string;
  parentId: string | null;
  path?: string;
  readOnly?: boolean;
}

export interface VirtualFolder {
  id: string;
  name: string;
  type: 'folder';
  parentId: string | null;
  isOpen?: boolean;
  path?: string;
}

export type VirtualNode = VirtualFile | VirtualFolder;

// Minimal empty structure - just the essential folders
// Files are added only when templates are loaded or AI generates code
const EMPTY_PROJECT_STRUCTURE: VirtualNode[] = [
  { id: 'src', name: 'src', type: 'folder', parentId: null, isOpen: true, path: '/src' },
];

// Complete React project structure with all essential files
// This is used when loading a full React template
const DEFAULT_PROJECT_STRUCTURE: VirtualNode[] = [
  // Root folders
  { id: 'src', name: 'src', type: 'folder', parentId: null, isOpen: true, path: '/src' },
  { id: 'public', name: 'public', type: 'folder', parentId: null, isOpen: false, path: '/public' },
  
  // Src subfolders
  { id: 'src-components', name: 'components', type: 'folder', parentId: 'src', isOpen: true, path: '/src/components' },
  { id: 'src-components-ui', name: 'ui', type: 'folder', parentId: 'src-components', isOpen: false, path: '/src/components/ui' },
  { id: 'src-hooks', name: 'hooks', type: 'folder', parentId: 'src', isOpen: false, path: '/src/hooks' },
  { id: 'src-pages', name: 'pages', type: 'folder', parentId: 'src', isOpen: false, path: '/src/pages' },
  { id: 'src-utils', name: 'utils', type: 'folder', parentId: 'src', isOpen: false, path: '/src/utils' },
  { id: 'src-lib', name: 'lib', type: 'folder', parentId: 'src', isOpen: false, path: '/src/lib' },
  { id: 'src-styles', name: 'styles', type: 'folder', parentId: 'src', isOpen: false, path: '/src/styles' },
  { id: 'src-types', name: 'types', type: 'folder', parentId: 'src', isOpen: false, path: '/src/types' },
  { id: 'src-context', name: 'context', type: 'folder', parentId: 'src', isOpen: false, path: '/src/context' },
  { id: 'src-services', name: 'services', type: 'folder', parentId: 'src', isOpen: false, path: '/src/services' },
  
  // Main entry files
  { 
    id: 'app-tsx', 
    name: 'App.tsx', 
    content: `import React from 'react';
import { Button } from './components/ui/Button';
import { HomePage } from './pages/HomePage';
import './styles/index.css';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <nav className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">My App</h1>
          <Button variant="outline">Sign In</Button>
        </nav>
      </header>
      <main>
        <HomePage />
      </main>
    </div>
  );
}

export default App;`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src', 
    path: '/src/App.tsx' 
  },
  { 
    id: 'main-tsx', 
    name: 'main.tsx', 
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src', 
    path: '/src/main.tsx' 
  },
  
  // Styles
  { 
    id: 'index-css', 
    name: 'index.css', 
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.75rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}

* {
  border-color: hsl(var(--border));
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  margin: 0;
  min-height: 100vh;
}`, 
    type: 'file', 
    language: 'css', 
    parentId: 'src-styles', 
    path: '/src/styles/index.css' 
  },
  
  // UI Components
  { 
    id: 'button-tsx', 
    name: 'Button.tsx', 
    content: `import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'default', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-8 text-lg',
  };
  
  return (
    <button 
      className={\`\${baseStyles} \${variants[variant]} \${sizes[size]} \${className}\`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src-components-ui', 
    path: '/src/components/ui/Button.tsx' 
  },
  { 
    id: 'card-tsx', 
    name: 'Card.tsx', 
    content: `import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={\`rounded-lg border bg-card text-card-foreground shadow-sm \${className}\`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={\`flex flex-col space-y-1.5 p-6 \${className}\`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: CardProps) {
  return (
    <h3 className={\`text-2xl font-semibold leading-none tracking-tight \${className}\`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }: CardProps) {
  return (
    <p className={\`text-sm text-muted-foreground \${className}\`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }: CardProps) {
  return (
    <div className={\`p-6 pt-0 \${className}\`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: CardProps) {
  return (
    <div className={\`flex items-center p-6 pt-0 \${className}\`}>
      {children}
    </div>
  );
}

export default Card;`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src-components-ui', 
    path: '/src/components/ui/Card.tsx' 
  },
  { 
    id: 'input-tsx', 
    name: 'Input.tsx', 
    content: `import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <input 
        className={\`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 \${error ? 'border-destructive' : ''} \${className}\`}
        {...props}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

export default Input;`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src-components-ui', 
    path: '/src/components/ui/Input.tsx' 
  },
  
  // Pages
  { 
    id: 'homepage-tsx', 
    name: 'HomePage.tsx', 
    content: `import React from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';

export function HomePage() {
  return (
    <div className="container mx-auto py-12 px-4">
      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Welcome to My App
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Build amazing web applications with React, TypeScript, and Tailwind CSS.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg">Get Started</Button>
          <Button variant="outline" size="lg">Learn More</Button>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fast Development</CardTitle>
            <CardDescription>
              Hot reloading and instant feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Write code and see changes instantly with our live preview system.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Type Safe</CardTitle>
            <CardDescription>
              Full TypeScript support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Catch errors early with comprehensive type checking and IntelliSense.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Beautiful UI</CardTitle>
            <CardDescription>
              Tailwind CSS included
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Create stunning interfaces with utility-first CSS framework.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default HomePage;`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src-pages', 
    path: '/src/pages/HomePage.tsx' 
  },
  
  // Hooks
  { 
    id: 'usestate-example-ts', 
    name: 'useState.ts', 
    content: `import { useState, useCallback } from 'react';

/**
 * Example custom hook for managing counter state
 */
export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);
  
  return { count, increment, decrement, reset };
}

/**
 * Example custom hook for managing toggle state
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  
  return { value, toggle, setTrue, setFalse };
}`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src-hooks', 
    path: '/src/hooks/useState.ts' 
  },
  
  // Utils
  { 
    id: 'cn-ts', 
    name: 'cn.ts', 
    content: `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src-utils', 
    path: '/src/utils/cn.ts' 
  },
  { 
    id: 'helpers-ts', 
    name: 'helpers.ts', 
    content: `/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src-utils', 
    path: '/src/utils/helpers.ts' 
  },
  
  // Types
  { 
    id: 'index-d-ts', 
    name: 'index.d.ts', 
    content: `// Global type declarations

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}`, 
    type: 'file', 
    language: 'typescript', 
    parentId: 'src-types', 
    path: '/src/types/index.d.ts' 
  },
  
  // Public files
  { 
    id: 'index-html', 
    name: 'index.html', 
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="My awesome React application" />
  <title>My App</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`, 
    type: 'file', 
    language: 'html', 
    parentId: 'public', 
    path: '/public/index.html' 
  },
  
  // Config files at root
  { 
    id: 'package-json', 
    name: 'package.json', 
    content: `{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "tailwindcss": "^3.4.4",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39"
  }
}`, 
    type: 'file', 
    language: 'json', 
    parentId: null, 
    path: '/package.json',
    readOnly: true
  },
  { 
    id: 'tsconfig-json', 
    name: 'tsconfig.json', 
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`, 
    type: 'file', 
    language: 'json', 
    parentId: null, 
    path: '/tsconfig.json',
    readOnly: true
  },
  { 
    id: 'tailwind-config-ts', 
    name: 'tailwind.config.ts', 
    content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
    },
  },
  plugins: [],
}`, 
    type: 'file', 
    language: 'typescript', 
    parentId: null, 
    path: '/tailwind.config.ts',
    readOnly: true
  },
  // Root index.html for Vite (required at root, not in /public)
  { 
    id: 'root-index-html', 
    name: 'index.html', 
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="My awesome React application" />
  <title>My App</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`, 
    type: 'file', 
    language: 'html', 
    parentId: null, 
    path: '/index.html',
    readOnly: true
  },
  // Vite config for runtime preview
  { 
    id: 'vite-config-ts', 
    name: 'vite.config.ts', 
    content: `import { defineConfig } from 'vite';
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
      clientPort: 443,
    },
  },
});`, 
    type: 'file', 
    language: 'typescript', 
    parentId: null, 
    path: '/vite.config.ts',
    readOnly: true
  },
  // PostCSS config for Tailwind
  { 
    id: 'postcss-config-js', 
    name: 'postcss.config.js', 
    content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`, 
    type: 'file', 
    language: 'javascript', 
    parentId: null, 
    path: '/postcss.config.js',
    readOnly: true
  },
  // TypeScript config for Node (Vite config)
  { 
    id: 'tsconfig-node-json', 
    name: 'tsconfig.node.json', 
    content: `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`, 
    type: 'file', 
    language: 'json', 
    parentId: null, 
    path: '/tsconfig.node.json',
    readOnly: true
  },
];

export function getLanguageFromFileName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'typescript';
    case 'jsx':
    case 'js':
      return 'javascript';
    case 'css':
    case 'scss':
    case 'sass':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return 'react';
    case 'ts':
      return 'typescript';
    case 'js':
      return 'javascript';
    case 'css':
    case 'scss':
    case 'sass':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'svg':
      return 'svg';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return 'image';
    default:
      return 'file';
  }
}

// Convert VFS to Sandpack files format
export function vfsToSandpackFiles(nodes: VirtualNode[]): Record<string, string> {
  const files: Record<string, string> = {};
  
  nodes.forEach(node => {
    if (node.type === 'file' && 'content' in node && node.path) {
      // Sandpack expects paths without leading slash for some files
      files[node.path] = node.content;
    }
  });
  
  return files;
}

/**
 * FileMap type: The standard format for VFS snapshots
 * Key = path (e.g., "/src/App.tsx")
 * Value = file content
 */
export type FileMap = Record<string, string>;

/**
 * Convert VFS nodes to FileMap snapshot for preview sessions
 * Filters to files only (excludes folders), maps path → content
 */
export function vfsToFileMap(nodes: VirtualNode[]): FileMap {
  const fileMap: FileMap = {};
  
  nodes.forEach(node => {
    if (node.type === 'file' && 'content' in node) {
      const file = node as VirtualFile;
      const path = file.path || `/${file.name}`;
      fileMap[path] = file.content;
    }
  });
  
  return fileMap;
}

/**
 * Get all file paths in the VFS
 */
export function getFilePaths(nodes: VirtualNode[]): string[] {
  return nodes
    .filter((node): node is VirtualFile => node.type === 'file' && 'content' in node)
    .map(file => file.path || `/${file.name}`)
    .sort();
}

export function useVirtualFileSystem() {
  // Start with empty structure - files added via templates/AI
  const [nodes, setNodes] = useState<VirtualNode[]>(EMPTY_PROJECT_STRUCTURE);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<string[]>([]);

  const getNodePath = useCallback((nodeId: string, currentNodes: VirtualNode[]): string => {
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) return '';
    
    if (!node.parentId) return `/${node.name}`;
    
    const parentPath = getNodePath(node.parentId, currentNodes);
    return `${parentPath}/${node.name}`;
  }, []);

  const createFile = useCallback((name: string, parentId: string | null = 'src') => {
    const id = `file-${Date.now()}`;
    const language = getLanguageFromFileName(name);
    
    // Get default content based on file type
    const getDefaultContent = (fileName: string): string => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'tsx':
          const componentName = fileName.replace(/\.\w+$/, '').replace(/[^a-zA-Z]/g, '');
          return `import React from 'react';

interface ${componentName}Props {
  // Add your props here
}

export function ${componentName}({ }: ${componentName}Props) {
  return (
    <div>
      <h1>${componentName}</h1>
    </div>
  );
}

export default ${componentName};`;
        case 'ts':
          return `// ${fileName}\n\nexport {};\n`;
        case 'css':
          return `/* ${fileName} */\n\n`;
        case 'json':
          return '{\n  \n}\n';
        default:
          return '';
      }
    };
    
    setNodes(prev => {
      const path = parentId ? `${getNodePath(parentId, prev)}/${name}` : `/${name}`;
      const newFile: VirtualFile = {
        id,
        name,
        content: getDefaultContent(name),
        type: 'file',
        language,
        parentId,
        path,
      };
      return [...prev, newFile];
    });
    
    setActiveFileId(id);
    setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
    return id;
  }, [getNodePath]);

  const createFolder = useCallback((name: string, parentId: string | null = 'src') => {
    const id = `folder-${Date.now()}`;
    
    setNodes(prev => {
      const path = parentId ? `${getNodePath(parentId, prev)}/${name}` : `/${name}`;
      const newFolder: VirtualFolder = {
        id,
        name,
        type: 'folder',
        parentId,
        isOpen: true,
        path,
      };
      return [...prev, newFolder];
    });
    return id;
  }, [getNodePath]);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => {
      // Check if node is read-only
      const node = prev.find(n => n.id === id);
      if (node?.type === 'file' && (node as VirtualFile).readOnly) {
        console.warn('Cannot delete read-only file:', node.name);
        return prev;
      }
      
      const toDelete = new Set<string>([id]);
      const findChildren = (parentId: string) => {
        prev.forEach(node => {
          if (node.parentId === parentId) {
            toDelete.add(node.id);
            if (node.type === 'folder') {
              findChildren(node.id);
            }
          }
        });
      };
      findChildren(id);
      
      // Update open tabs
      setOpenTabs(tabs => tabs.filter(tabId => !toDelete.has(tabId)));
      
      // Update active file
      if (toDelete.has(activeFileId)) {
        const remainingFiles = prev.filter(n => n.type === 'file' && !toDelete.has(n.id));
        setActiveFileId(remainingFiles[0]?.id || '');
      }
      
      return prev.filter(n => !toDelete.has(n.id));
    });
  }, [activeFileId]);

  const renameNode = useCallback((id: string, newName: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        // Check if node is read-only
        if (node.type === 'file' && (node as VirtualFile).readOnly) {
          console.warn('Cannot rename read-only file:', node.name);
          return node;
        }
        
        const newPath = node.parentId 
          ? `${getNodePath(node.parentId, prev)}/${newName}`
          : `/${newName}`;
        
        if (node.type === 'file') {
          return { 
            ...node, 
            name: newName, 
            path: newPath,
            language: getLanguageFromFileName(newName)
          };
        }
        return { ...node, name: newName, path: newPath };
      }
      return node;
    }));
  }, [getNodePath]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const newId = `${node.type}-${Date.now()}`;
    const nameMatch = node.name.match(/^(.+?)( \((\d+)\))?(\.[^.]+)?$/);
    const baseName = nameMatch?.[1] || node.name;
    const extension = nameMatch?.[4] || '';
    const newName = `${baseName} (copy)${extension}`;

    if (node.type === 'file') {
      const newFile: VirtualFile = {
        ...node,
        id: newId,
        name: newName,
        path: node.parentId ? `${getNodePath(node.parentId, nodes)}/${newName}` : `/${newName}`,
        readOnly: false, // Duplicated files are never read-only
      };
      setNodes(prev => [...prev, newFile]);
      setActiveFileId(newId);
      setOpenTabs(prev => [...prev, newId]);
    } else {
      const newFolder: VirtualFolder = {
        ...node,
        id: newId,
        name: newName,
        path: node.parentId ? `${getNodePath(node.parentId, nodes)}/${newName}` : `/${newName}`,
      };
      setNodes(prev => [...prev, newFolder]);
    }
  }, [nodes, getNodePath]);

  const moveNode = useCallback((nodeId: string, newParentId: string | null) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        const newPath = newParentId 
          ? `${getNodePath(newParentId, prev)}/${node.name}`
          : `/${node.name}`;
        return { ...node, parentId: newParentId, path: newPath };
      }
      return node;
    }));
  }, [getNodePath]);

  const updateFileContent = useCallback((id: string, content: string) => {
    setNodes(prev => prev.map(node =>
      node.id === id && node.type === 'file' ? { ...node, content } : node
    ));
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setNodes(prev => prev.map(node =>
      node.id === id && node.type === 'folder' 
        ? { ...node, isOpen: !node.isOpen } 
        : node
    ));
  }, []);

  const expandAll = useCallback(() => {
    setNodes(prev => prev.map(node =>
      node.type === 'folder' ? { ...node, isOpen: true } : node
    ));
  }, []);

  const collapseAll = useCallback(() => {
    setNodes(prev => prev.map(node =>
      node.type === 'folder' ? { ...node, isOpen: false } : node
    ));
  }, []);

  const getActiveFile = useCallback(() => {
    return nodes.find(n => n.id === activeFileId && n.type === 'file') as VirtualFile | undefined;
  }, [nodes, activeFileId]);

  const openFile = useCallback((id: string) => {
    const file = nodes.find(n => n.id === id && n.type === 'file');
    if (file) {
      setActiveFileId(id);
      setOpenTabs(prev => prev.includes(id) ? prev : [...prev, id]);
    }
  }, [nodes]);

  const closeTab = useCallback((id: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(tabId => tabId !== id);
      if (activeFileId === id && newTabs.length > 0) {
        setActiveFileId(newTabs[newTabs.length - 1]);
      } else if (newTabs.length === 0) {
        setActiveFileId('');
      }
      return newTabs;
    });
  }, [activeFileId]);

  const getOpenFiles = useCallback(() => {
    return openTabs
      .map(id => nodes.find(n => n.id === id && n.type === 'file') as VirtualFile)
      .filter(Boolean);
  }, [openTabs, nodes]);

  // Get all files for Sandpack
  const getSandpackFiles = useCallback(() => {
    return vfsToSandpackFiles(nodes);
  }, [nodes]);

  // Import files from external source (e.g., AI-generated code)
  const importFiles = useCallback((files: Record<string, string>) => {
    console.log('[VFS] importFiles called with:', Object.keys(files));
    setNodes(prev => {
      const newNodes = [...prev];
      
      Object.entries(files).forEach(([path, content]) => {
        // Normalize path
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        console.log('[VFS] Processing file:', normalizedPath, 'content length:', content.length);
        
        // Check if file already exists
        const existingFile = newNodes.find(n => n.type === 'file' && n.path === normalizedPath);
        if (existingFile) {
          // Update existing file
          const idx = newNodes.indexOf(existingFile);
          newNodes[idx] = { ...existingFile, content } as VirtualFile;
        } else {
          // Create new file and any missing parent folders
          const pathParts = normalizedPath.split('/').filter(Boolean);
          const fileName = pathParts.pop()!;
          
          let currentParentId: string | null = null;
          let currentPath = '';
          
          // Create parent folders if they don't exist
          pathParts.forEach((folderName) => {
            currentPath += `/${folderName}`;
            const existingFolder = newNodes.find(n => n.type === 'folder' && n.path === currentPath);
            
            if (!existingFolder) {
              const folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              newNodes.push({
                id: folderId,
                name: folderName,
                type: 'folder',
                parentId: currentParentId,
                isOpen: true,
                path: currentPath,
              });
              currentParentId = folderId;
            } else {
              currentParentId = existingFolder.id;
            }
          });
          
          // Create the file
          const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          newNodes.push({
            id: fileId,
            name: fileName,
            content,
            type: 'file',
            language: getLanguageFromFileName(fileName),
            parentId: currentParentId,
            path: normalizedPath,
          });
        }
      });
      
      console.log('[VFS] After import, total nodes:', newNodes.length, 'files:', newNodes.filter(n => n.type === 'file').length);
      return newNodes;
    });
  }, []);

  // Sort nodes: folders first, then files, alphabetically
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [nodes]);

  // File statistics
  const stats = useMemo(() => {
    const files = nodes.filter(n => n.type === 'file');
    const folders = nodes.filter(n => n.type === 'folder');
    return {
      totalFiles: files.length,
      totalFolders: folders.length,
      byLanguage: files.reduce((acc, file) => {
        const lang = (file as VirtualFile).language || 'unknown';
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [nodes]);

  // Reset to empty structure
  const resetToEmpty = useCallback(() => {
    setNodes(EMPTY_PROJECT_STRUCTURE);
    setActiveFileId('');
    setOpenTabs([]);
  }, []);

  // Load the full default React project template
  const loadDefaultTemplate = useCallback(() => {
    setNodes(DEFAULT_PROJECT_STRUCTURE);
    setActiveFileId('app-tsx');
    setOpenTabs(['app-tsx']);
  }, []);

  // Check if VFS has any user files (not just folders)
  const hasFiles = useMemo(() => {
    return nodes.some(n => n.type === 'file');
  }, [nodes]);

  return {
    nodes: sortedNodes,
    activeFileId,
    openTabs,
    stats,
    hasFiles,
    setActiveFileId,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    duplicateNode,
    moveNode,
    updateFileContent,
    toggleFolder,
    expandAll,
    collapseAll,
    getActiveFile,
    openFile,
    closeTab,
    getOpenFiles,
    getNodePath,
    getSandpackFiles,
    importFiles,
    resetToEmpty,
    loadDefaultTemplate,
  };
}
