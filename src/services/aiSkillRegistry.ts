/**
 * AI Skills & Capabilities System
 * 
 * Inspired by Claude Code's skills architecture.
 * Provides extensible AI capabilities that can be:
 * - Loaded dynamically
 * - Composed into larger workflows
 * - Versioned and updated
 * - Disabled selectively
 * 
 * Skills encapsulate domain knowledge for:
 * - Code analysis
 * - VFS operations
 * - Troubleshooting
 * - Testing
 * - Deploy & DevOps
 */

import { getGlobalAITerminalBridge } from '@/services/aiTerminalBridge';

function extractModuleImports(code: string): string[] {
  const imports = new Set<string>();
  const importRegex = /from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(code)) !== null) {
    const specifier = match[1] || match[2];
    if (specifier) imports.add(specifier);
  }
  return Array.from(imports);
}

function toTopLevelPackage(specifier: string): string {
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/');
    return name ? `${scope}/${name}` : specifier;
  }
  return specifier.split('/')[0] || specifier;
}

function isExternalImport(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('@/');
}

/**
 * A single AI skill (capability)
 */
export interface AISkill {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  /**
   * System prompt guidance for this skill
   */
  systemPrompt: string;
  /**
   * Tools/functions this skill can use
   */
  tools: SkillTool[];
  /**
   * Prerequisites (other skills that must be loaded)
   */
  dependencies?: string[];
}

/**
 * A tool that an AI skill can execute
 */
export interface SkillTool {
  id: string;
  name: string;
  description: string;
  /** Input schema for Claude function calling */
  inputSchema: Record<string, unknown>;
  /** Execute the tool */
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Collection of skills loadable by the AI system
 */
export interface SkillSet {
  skills: Map<string, AISkill>;
  /** Load a skill by ID */
  loadSkill(id: string): void;
  /** Unload a skill */
  unloadSkill(id: string): void;
  /** Get all loaded skills */
  getLoadedSkills(): AISkill[];
  /** Get system prompt combining all loaded skills */
  getSystemPrompt(): string;
  /** Get all tools from loaded skills */
  getTools(): SkillTool[];
}

/**
 * Default skills for AI system
 */

export const SKILL_CODE_ANALYSIS: AISkill = {
  id: 'code-analysis',
  name: 'Code Analysis',
  description: 'Analyze code structure, imports, dependencies, and quality',
  version: '1.0.0',
  enabled: true,
  systemPrompt: `You are an expert code analyzer. When analyzing code:
- Identify dependencies and imports
- Check for unused imports and dead code
- Analyze complexity and suggest refactors
- Identify potential bugs and security issues
- Provide improvement suggestions`,
  tools: [
    {
      id: 'analyze-imports',
      name: 'Analyze Imports',
      description: 'Analyze imports in a file for missing dependencies',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'File path to analyze' },
          code: { type: 'string', description: 'Code content to analyze' },
        },
        required: ['filePath'],
      },
      execute: async (input) => {
        const code = typeof input.code === 'string' ? input.code : '';
        const imports = extractModuleImports(code);
        const externalImports = imports.filter(isExternalImport);
        const topLevelImports = Array.from(new Set(externalImports.map(toTopLevelPackage)));
        const bridge = getGlobalAITerminalBridge();
        const dependencies = bridge.getCurrentDependencies();
        const missing = topLevelImports.filter((pkg) => !dependencies[pkg]);

        return {
          filePath: typeof input.filePath === 'string' ? input.filePath : undefined,
          imports,
          externalImports: topLevelImports,
          missing,
          unused: [],
        };
      },
    },
    {
      id: 'check-dependencies',
      name: 'Check Dependencies',
      description: 'Verify all imports have corresponding dependencies',
      inputSchema: {
        type: 'object',
        properties: {
          imports: { type: 'array', items: { type: 'string' } },
          dependencies: { type: 'object' },
        },
        required: ['imports', 'dependencies'],
      },
      execute: async (input) => {
        const imports = Array.isArray(input.imports)
          ? input.imports.filter((item): item is string => typeof item === 'string')
          : [];
        const rawDependencies =
          input.dependencies && typeof input.dependencies === 'object'
            ? (input.dependencies as Record<string, unknown>)
            : {};

        const dependencyNames = Object.keys(rawDependencies);
        const normalizedImports = Array.from(new Set(imports.filter(isExternalImport).map(toTopLevelPackage)));
        const missing = normalizedImports.filter((pkg) => !dependencyNames.includes(pkg));
        const unused = dependencyNames.filter((pkg) => !normalizedImports.includes(pkg));

        return { missing, unused };
      },
    },
  ],
};

export const SKILL_VFSTROUBLESHOOTING: AISkill = {
  id: 'vfs-troubleshooting',
  name: 'VFS Troubleshooting',
  description: 'Diagnose and fix VFS file system issues',
  version: '1.0.0',
  enabled: true,
  systemPrompt: `You are a VFS troubleshooting expert. When helping with VFS issues:
- Use diagnose command to understand current state
- Check file tree and dependencies
- Identify broken imports and missing files
- Suggest fixes in order of impact
- Test fixes with appropriate commands`,
  tools: [
    {
      id: 'vfs-diagnose',
      name: 'VFS Diagnose',
      description: 'Run full VFS diagnostics',
      inputSchema: { type: 'object', properties: {}, required: [] },
      execute: async () => {
        const bridge = getGlobalAITerminalBridge();
        const snapshot = bridge.getVFSSnapshot();
        const dependencies = bridge.getCurrentDependencies();
        const filePaths = Object.keys(snapshot);

        const importIssues: string[] = [];
        for (const [path, content] of Object.entries(snapshot)) {
          if (!/\.(ts|tsx|js|jsx)$/.test(path)) continue;
          const imports = extractModuleImports(content).filter(isExternalImport).map(toTopLevelPackage);
          for (const pkg of imports) {
            if (!dependencies[pkg]) {
              importIssues.push(`${path}: missing dependency ${pkg}`);
            }
          }
        }

        return {
          issues: importIssues,
          files: filePaths,
          dependencyCount: Object.keys(dependencies).length,
        };
      },
    },
  ],
};

export const SKILL_TESTING: AISkill = {
  id: 'testing',
  name: 'Testing',
  description: 'Create and run tests for code',
  version: '1.0.0',
  enabled: true,
  systemPrompt: `You are a testing expert. When writing tests:
- Create comprehensive test cases
- Cover edge cases and error conditions
- Use appropriate test frameworks
- Ensure tests are maintainable and clear`,
  tools: [
    {
      id: 'run-tests',
      name: 'Run Tests',
      description: 'Execute test suite',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Test command to run' },
        },
        required: ['command'],
      },
      execute: async (input) => {
        const bridge = getGlobalAITerminalBridge();
        const command = typeof input.command === 'string'
          ? String(input.command)
          : 'npm test';
        const result = await bridge.executeRuntime({
          id: `skill-test-${Date.now()}`,
          command,
        });

        return {
          passed: result.success ? 1 : 0,
          failed: result.success ? 0 : 1,
          duration: result.duration,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        };
      },
    },
  ],
};

/**
 * Skill registry and management
 */
export class AISkillRegistry implements SkillSet {
  skills: Map<string, AISkill> = new Map();
  private loaded: Set<string> = new Set();

  constructor() {
    // Register default skills
    this.registerSkill(SKILL_CODE_ANALYSIS);
    this.registerSkill(SKILL_VFSTROUBLESHOOTING);
    this.registerSkill(SKILL_TESTING);

    // Enable default skills immediately for runtime bridge sessions.
    this.skills.forEach((skill) => {
      if (skill.enabled) {
        this.loaded.add(skill.id);
      }
    });
  }

  registerSkill(skill: AISkill): void {
    this.skills.set(skill.id, skill);
  }

  loadSkill(id: string): void {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`Skill not found: ${id}`);
    }

    // Load dependencies first
    if (skill.dependencies) {
      skill.dependencies.forEach(dep => {
        if (!this.loaded.has(dep)) {
          this.loadSkill(dep);
        }
      });
    }

    this.loaded.add(id);
  }

  unloadSkill(id: string): void {
    this.loaded.delete(id);
  }

  getLoadedSkills(): AISkill[] {
    const result: AISkill[] = [];
    this.loaded.forEach(id => {
      const skill = this.skills.get(id);
      if (skill && skill.enabled) {
        result.push(skill);
      }
    });
    return result;
  }

  getSystemPrompt(): string {
    const loaded = this.getLoadedSkills();
    return (
      'You are Claude, an AI assistant helping with code and tasks.\n\n' +
      'Active Skills:\n' +
      loaded.map(s => `- ${s.name}: ${s.description}`).join('\n') +
      '\n\n' +
      loaded.map(s => s.systemPrompt).join('\n\n')
    );
  }

  getTools(): SkillTool[] {
    const tools: SkillTool[] = [];
    this.getLoadedSkills().forEach(skill => {
      tools.push(...skill.tools);
    });
    return tools;
  }

  getSkillMetadata(): { name: string; enabled: boolean; tools: number }[] {
    return Array.from(this.skills.values()).map(s => ({
      name: s.name,
      enabled: this.loaded.has(s.id),
      tools: s.tools.length,
    }));
  }
}

export const globalSkillRegistry = new AISkillRegistry();
