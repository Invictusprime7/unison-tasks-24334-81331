import { afterEach, describe, expect, it } from 'vitest';
import {
  getGlobalAITerminalBridge,
  resetGlobalAITerminalBridge,
} from '@/services/aiTerminalBridge';
import type { VirtualNode } from '@/hooks/useVirtualFileSystem';

const initialNodes: VirtualNode[] = [
  {
    id: 'package-json',
    name: 'package.json',
    path: '/package.json',
    type: 'file',
    parentId: null,
    language: 'json',
    content: JSON.stringify({ name: 'preview', dependencies: { react: '^18.3.1' } }),
  },
];

afterEach(() => resetGlobalAITerminalBridge());

describe('AI terminal dependency installation', () => {
  it('writes installs into VFS package.json and notifies the preview owner', async () => {
    const bridge = getGlobalAITerminalBridge(initialNodes, { react: '^18.3.1' });
    const changes: string[] = [];
    bridge.watchVFS((paths) => changes.push(...paths));

    const result = await bridge.executeCommand({
      id: 'install-style-runtime',
      command: 'install bootstrap@^5.3.3 @stylexjs/stylex@^0.8.0',
      reason: 'test',
      structured: true,
    });

    const manifest = JSON.parse(bridge.getVFSSnapshot()['/package.json']);
    expect(result.success).toBe(true);
    expect(manifest.dependencies.bootstrap).toBe('^5.3.3');
    expect(manifest.dependencies['@stylexjs/stylex']).toBe('^0.8.0');
    expect(changes).toContain('/package.json');
  });
});
