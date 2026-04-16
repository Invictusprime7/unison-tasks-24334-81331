# VFS → ECS Vite Runtime → iframe Live Preview

> **Stack**: React 18 + TypeScript 5.9 | VFSContext (React Context) | Sandpack 2.20 (in-browser bundler) | Docker + Vite (containerized HMR) | Monaco Editor + Fabric.js canvas

## Architecture Overview

This document describes the live preview system that connects the Virtual File System (VFS) to an ECS-based Vite runtime for production-grade React previews with true Hot Module Replacement (HMR).

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNISON PREVIEW SYSTEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐      ┌──────────────┐      ┌───────────────┐  │
│  │     VFS     │──────▶│  FileMap     │──────▶│   Gateway    │  │
│  │   Nodes     │      │  Snapshot    │      │   /preview   │  │
│  └─────────────┘      └──────────────┘      └───────┬───────┘  │
│                                                     │          │
│                                        ┌────────────┴─────────┐│
│                                        ▼                      ▼│
│                               ┌─────────────┐      ┌──────────┐│
│                               │ ECS Worker  │◀─────│  Patch   ││
│                               │  (Vite)     │      │ Endpoint ││
│                               └──────┬──────┘      └──────────┘│
│                                      │                         │
│                                      ▼                         │
│  ┌─────────────┐            ┌─────────────┐                   │
│  │   iframe    │◀───────────│   HMR       │                   │
│  │  Preview    │            │  Updates    │                   │
│  └─────────────┘            └─────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. FileMap Snapshot (`src/hooks/useVirtualFileSystem.ts`)

The VFS stores files as `VirtualNode[]`. The `vfsToFileMap()` function converts this to a standardized `FileMap`:

```typescript
type FileMap = Record<string, string>;  // path → content

// Example:
{
  "/index.html": "<!DOCTYPE html>...",
  "/src/App.tsx": "import React...",
  "/src/main.tsx": "import ReactDOM...",
  "/package.json": "{...}"
}
```

**Key Functions:**
- `vfsToFileMap(nodes)` - Convert VFS nodes to FileMap
- `vfsToSandpackFiles(nodes)` - Legacy Sandpack format
- `getFilePaths(nodes)` - Get list of all file paths

### 2. Preview Session Service (`src/services/previewSession.ts`)

Manages the lifecycle of ECS Vite runtime sessions:

```typescript
// Start a new session
const result = await startPreviewSession(projectId, files);
// result.session.iframeUrl = "https://preview-abc123.unison.app"

// Patch a file for HMR
await patchFile(sessionId, "/src/App.tsx", newContent);

// Get logs
const logs = await getSessionLogs(sessionId);

// Stop session
await stopPreviewSession(sessionId);
```

**Features:**
- Auto-inject required Vite root files (if missing)
- 30-second keepalive pings
- Session caching
- Static HTML fallback generation

### 3. Vite Root Files Auto-Injection

The system automatically injects these files if missing:

| File | Purpose |
|------|---------|
| `/index.html` | Vite entry point |
| `/package.json` | Dependencies |
| `/vite.config.ts` | Vite configuration |
| `/tsconfig.json` | TypeScript config |
| `/tsconfig.node.json` | Node config for Vite |
| `/postcss.config.js` | PostCSS/Tailwind |
| `/tailwind.config.js` | Tailwind config |
| `/src/main.tsx` | React entry |
| `/src/index.css` | Base styles |
| `/src/App.tsx` | Default app component |

### 4. SimplePreview Component (`src/components/creatives/SimplePreview.tsx`)

Three-tier preview with automatic fallback:

```
Runtime (ECS Vite) → Sandpack (Browser) → HTML (Static)
      ↓ fail              ↓ timeout           ↓ always works
```

**Usage:**
```tsx
<SimplePreview
  files={getSandpackFiles()}
  projectId="my-project"
  activeFile="/src/App.tsx"
  onReady={() => console.log('Preview ready')}
  onError={(e) => console.error(e)}
  showConsole={true}
  disableRuntime={false}  // Set true to use Sandpack as primary
/>
```

### 5. usePreviewSession Hook (`src/hooks/usePreviewSession.ts`)

React hook for managing preview sessions:

```typescript
const {
  session,      // Current session info
  status,       // 'idle' | 'starting' | 'running' | 'syncing' | 'error'
  error,        // Error message if any
  logs,         // Console output from Vite
  iframeUrl,    // URL for preview iframe
  startSession, // Start new session with VFS nodes
  syncFile,     // Sync single file (debounced)
  syncAllFiles, // Sync all files
  stopSession,  // Clean up session
  clearLogs,    // Clear log buffer
  refreshLogs,  // Force refresh logs
} = usePreviewSession(projectId);
```

## API Endpoints

### POST `/preview/start`
Create a new preview session.

**Request:**
```json
{
  "projectId": "string",
  "files": { "/path": "content", ... }
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "abc123",
    "projectId": "my-project",
    "status": "running",
    "iframeUrl": "https://preview-abc123.unison.app",
    "createdAt": "2024-01-15T...",
    "lastActivityAt": "2024-01-15T..."
  }
}
```

### PATCH `/preview/{sessionId}/file`
Update a file for HMR.

**Request:**
```json
{
  "path": "/src/App.tsx",
  "content": "new file content..."
}
```

### GET `/preview/{sessionId}/logs`
Get session stdout/stderr.

**Response:**
```json
{
  "logs": ["[vite] hmr update...", "..."],
  "hasMore": false
}
```

### POST `/preview/{sessionId}/ping`
Keep session alive (called every 30 seconds).

### POST `/preview/{sessionId}/stop`
Terminate the session and release resources.

## VFS Root Files

The VFS `DEFAULT_PROJECT_STRUCTURE` includes all required root files:

```typescript
const DEFAULT_PROJECT_STRUCTURE = [
  // Folders
  { id: 'src', name: 'src', type: 'folder', ... },
  { id: 'public', name: 'public', type: 'folder', ... },
  
  // Root config files (readOnly)
  { id: 'root-index-html', name: 'index.html', path: '/index.html', ... },
  { id: 'package-json', name: 'package.json', path: '/package.json', ... },
  { id: 'vite-config-ts', name: 'vite.config.ts', path: '/vite.config.ts', ... },
  { id: 'tsconfig-json', name: 'tsconfig.json', path: '/tsconfig.json', ... },
  { id: 'tsconfig-node-json', name: 'tsconfig.node.json', path: '/tsconfig.node.json', ... },
  { id: 'postcss-config-js', name: 'postcss.config.js', path: '/postcss.config.js', ... },
  { id: 'tailwind-config-ts', name: 'tailwind.config.ts', path: '/tailwind.config.ts', ... },
  
  // Source files
  { id: 'app-tsx', name: 'App.tsx', path: '/src/App.tsx', ... },
  { id: 'main-tsx', name: 'main.tsx', path: '/src/main.tsx', ... },
  { id: 'index-css', name: 'index.css', path: '/src/styles/index.css', ... },
  // ... more files
];
```

## Integration Example

```tsx
import { useVirtualFileSystem, vfsToFileMap } from '@/hooks/useVirtualFileSystem';
import { usePreviewSession } from '@/hooks/usePreviewSession';
import { SimplePreview } from '@/components/creatives/SimplePreview';

function WebBuilder() {
  const vfs = useVirtualFileSystem();
  const preview = usePreviewSession('my-project');
  
  // Start preview when ready
  useEffect(() => {
    preview.startSession(vfs.nodes);
  }, []);
  
  // Sync files on change
  const handleFileChange = (path: string, content: string) => {
    vfs.updateFileContent(path, content);
    preview.syncFile(path, content);
  };
  
  return (
    <div className="flex h-screen">
      <Editor files={vfs.nodes} onChange={handleFileChange} />
      <SimplePreview
        files={vfsToFileMap(vfs.nodes)}
        projectId="my-project"
      />
    </div>
  );
}
```

## Fallback Behavior

1. **Runtime Available**: Uses ECS Vite container with true HMR
2. **Runtime Unavailable**: Falls back to Sandpack (browser bundling)
3. **Sandpack Timeout**: Falls back to static HTML preview

The system prioritizes reliability while providing the best possible preview experience.

## Environment Variables

```env
# Preview service base URL (defaults to /api/preview)
VITE_PREVIEW_API_URL=https://api.unison.app/preview
```

## Files Summary

| File | Purpose |
|------|---------|
| `src/hooks/useVirtualFileSystem.ts` | VFS with FileMap exports |
| `src/hooks/usePreviewSession.ts` | Session management hook |
| `src/services/previewSession.ts` | Preview API service |
| `src/components/creatives/SimplePreview.tsx` | Preview component |
