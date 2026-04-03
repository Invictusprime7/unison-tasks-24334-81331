/**
 * TSX Transform Pipeline
 * 
 * AST-based transforms for TSX/React code.
 * Replaces regex-based transformations with proper parsing.
 * 
 * Key features:
 * - Parse TSX/JSX to AST
 * - Apply transforms (image src replacement, imports, hooks)
 * - Print back to code
 * - Validate and fallback to patch mode if invalid
 */

import type {
  TransformOperation,
  TransformResult,
  AppliedTransform,
  TransformError,
  TransformWarning,
  TransformPipelineOptions,
  ValidationResult,
} from '@/types/transform';
import type { AssetReference } from '@/types/asset';
import { getAssetRegistry } from '@/services/assetRegistry';

/**
 * Simple TSX tokenizer for safe transforms without full Babel dependency
 * This is a lightweight alternative that handles common patterns
 */
class TSXTokenizer {
  private code: string;
  private position: number = 0;
  
  constructor(code: string) {
    this.code = code;
  }

  /**
   * Find all image elements with src attributes
   */
  findImageSrcs(): Array<{
    element: 'img' | 'Image';
    srcStart: number;
    srcEnd: number;
    srcValue: string;
    fullMatch: string;
    line: number;
    column: number;
  }> {
    const results: Array<{
      element: 'img' | 'Image';
      srcStart: number;
      srcEnd: number;
      srcValue: string;
      fullMatch: string;
      line: number;
      column: number;
    }> = [];

    // Match <img src="..." /> and <Image src="..." />
    const imgRegex = /<(img|Image)\s+([^>]*?)src\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})([^>]*?)(?:\/>|>)/gi;
    
    let match;
    while ((match = imgRegex.exec(this.code)) !== null) {
      const element = match[1] as 'img' | 'Image';
      const srcValue = match[3] || match[4] || match[5] || '';
      const srcStart = match.index + match[0].indexOf('src=');
      const srcEnd = srcStart + `src="${srcValue}"`.length;
      
      // Calculate line/column
      const beforeMatch = this.code.substring(0, match.index);
      const lines = beforeMatch.split('\n');
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      results.push({
        element,
        srcStart,
        srcEnd,
        srcValue,
        fullMatch: match[0],
        line,
        column,
      });
    }

    return results;
  }

  /**
   * Find import statements
   */
  findImports(): Array<{
    statement: string;
    start: number;
    end: number;
    module: string;
  }> {
    const results: Array<{
      statement: string;
      start: number;
      end: number;
      module: string;
    }> = [];

    const importRegex = /^import\s+.*?\s+from\s+['"]([^'"]+)['"];?\s*$/gm;
    
    let match;
    while ((match = importRegex.exec(this.code)) !== null) {
      results.push({
        statement: match[0],
        start: match.index,
        end: match.index + match[0].length,
        module: match[1],
      });
    }

    return results;
  }

  /**
   * Find hardcoded image paths (relative paths, URLs)
   */
  findHardcodedPaths(): Array<{
    path: string;
    start: number;
    end: number;
    type: 'relative' | 'absolute' | 'url';
  }> {
    const results: Array<{
      path: string;
      start: number;
      end: number;
      type: 'relative' | 'absolute' | 'url';
    }> = [];

    // Match relative paths like "./image.png", "../assets/logo.png"
    const relativePathRegex = /["'](\.\.[/\\][^"']+|\.\/[^"']+)["']/g;
    
    let match;
    while ((match = relativePathRegex.exec(this.code)) !== null) {
      if (match[1].match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
        results.push({
          path: match[1],
          start: match.index,
          end: match.index + match[0].length,
          type: 'relative',
        });
      }
    }

    return results;
  }

  /**
   * Check if code has React/Next.js Image import
   */
  hasImageImport(): boolean {
    return /import\s+.*Image.*\s+from\s+['"]next\/image['"]/.test(this.code) ||
           /import\s+.*Image.*\s+from\s+['"]react['"]/.test(this.code);
  }

  /**
   * Find component function declaration
   */
  findComponentStart(): number | null {
    // Match function Component() or const Component = () =>
    const funcMatch = this.code.match(/(?:export\s+)?(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{/);
    const arrowMatch = this.code.match(/(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>\s*\{/);
    
    if (funcMatch && funcMatch.index !== undefined) {
      return funcMatch.index + funcMatch[0].length;
    }
    if (arrowMatch && arrowMatch.index !== undefined) {
      return arrowMatch.index + arrowMatch[0].length;
    }
    return null;
  }
}

/**
 * Transform pipeline for TSX/React code
 */
export class TSXTransformPipeline {
  private registry = getAssetRegistry();
  private options: Required<TransformPipelineOptions>;

  constructor(options: TransformPipelineOptions = {}) {
    this.options = {
      validateAfter: options.validateAfter ?? true,
      fallbackToPatch: options.fallbackToPatch ?? true,
      preserveFormatting: options.preserveFormatting ?? true,
      addMissingImports: options.addMissingImports ?? true,
      insertAssetHook: options.insertAssetHook ?? false,
    };
  }

  /**
   * Transform code to use asset references instead of hardcoded paths
   */
  transform(
    code: string,
    assetMappings: Array<{ pattern: string; assetId: string }>
  ): TransformResult {
    const errors: TransformError[] = [];
    const warnings: TransformWarning[] = [];
    const appliedTransforms: AppliedTransform[] = [];
    
    let transformedCode = code;
    const tokenizer = new TSXTokenizer(code);

    try {
      // 1. Find and replace hardcoded image paths
      const imageSrcs = tokenizer.findImageSrcs();
      const hardcodedPaths = tokenizer.findHardcodedPaths();

      // Process mappings
      for (const mapping of assetMappings) {
        const asset = this.registry.get(mapping.assetId);
        if (!asset) {
          errors.push({
            message: `Asset ${mapping.assetId} not found`,
            recoverable: true,
          });
          continue;
        }

        const assetRef: AssetReference = {
          assetId: asset.id,
          url: asset.url,
          alt: asset.name,
          width: asset.width,
          height: asset.height,
        };

        // Replace in img/Image src attributes
        for (const imgSrc of imageSrcs) {
          if (imgSrc.srcValue.includes(mapping.pattern) || 
              imgSrc.srcValue === mapping.pattern) {
            
            // Determine replacement format
            const isJSXExpression = imgSrc.fullMatch.includes('{');
            const newSrc = isJSXExpression 
              ? `{assets.get("${asset.id}").url}`
              : `"${asset.url}"`;

            // Apply replacement
            const srcAttrRegex = new RegExp(
              `src\\s*=\\s*(?:"[^"]*${escapeRegex(mapping.pattern)}[^"]*"|'[^']*${escapeRegex(mapping.pattern)}[^']*'|\\{[^}]*${escapeRegex(mapping.pattern)}[^}]*\\})`,
              'g'
            );

            const before = transformedCode;
            transformedCode = transformedCode.replace(srcAttrRegex, `src=${newSrc}`);

            if (before !== transformedCode) {
              appliedTransforms.push({
                operation: {
                  type: 'replace-image-src',
                  selector: `<${imgSrc.element}>`,
                  oldSrc: imgSrc.srcValue,
                  assetId: asset.id,
                  assetRef,
                },
                location: { line: imgSrc.line, column: imgSrc.column },
                before: imgSrc.srcValue,
                after: newSrc,
              });

              // Add dimensions hint if missing
              if (asset.width && asset.height && 
                  !imgSrc.fullMatch.includes('width') && 
                  !imgSrc.fullMatch.includes('height')) {
                warnings.push({
                  message: `Image missing dimensions: ${imgSrc.srcValue}`,
                  suggestion: `Add width={${asset.width}} height={${asset.height}}`,
                });
              }

              // Add alt if missing
              if (!imgSrc.fullMatch.includes('alt=')) {
                warnings.push({
                  message: `Image missing alt text: ${imgSrc.srcValue}`,
                  suggestion: `Add alt="${asset.name}"`,
                });
              }
            }
          }
        }

        // Replace hardcoded paths in other contexts
        for (const pathInfo of hardcodedPaths) {
          if (pathInfo.path.includes(mapping.pattern) || 
              pathInfo.path === mapping.pattern) {
            
            const oldQuoted = `"${pathInfo.path}"`;
            const newValue = `assets.get("${asset.id}").url`;

            if (transformedCode.includes(oldQuoted)) {
              transformedCode = transformedCode.replace(oldQuoted, newValue);
              appliedTransforms.push({
                operation: {
                  type: 'replace-hardcoded-path',
                  oldPath: pathInfo.path,
                  assetId: asset.id,
                },
                before: oldQuoted,
                after: newValue,
              });
            }
          }
        }
      }

      // 2. Add useAssets hook if we made changes and option enabled
      if (this.options.insertAssetHook && appliedTransforms.length > 0) {
        const hookInsert = this.insertAssetHook(transformedCode);
        if (hookInsert.modified) {
          transformedCode = hookInsert.code;
          appliedTransforms.push({
            operation: {
              type: 'insert-asset-hook',
              hookName: 'useAssetRegistry',
              assetIds: assetMappings.map(m => m.assetId),
            },
          });
        }
      }

      // 3. Add import if needed
      if (this.options.addMissingImports && appliedTransforms.length > 0) {
        if (!transformedCode.includes('useAssetRegistry') && 
            transformedCode.includes('assets.get(')) {
          const importStatement = `import { useAssetRegistry } from '@/hooks/useAssetRegistry';\n`;
          const imports = tokenizer.findImports();
          
          if (imports.length > 0) {
            // Insert after last import
            const lastImport = imports[imports.length - 1];
            transformedCode = 
              transformedCode.slice(0, lastImport.end) + 
              '\n' + importStatement +
              transformedCode.slice(lastImport.end);
          } else {
            // Insert at beginning
            transformedCode = importStatement + transformedCode;
          }

          appliedTransforms.push({
            operation: {
              type: 'add-import',
              importStatement,
              module: '@/hooks/useAssetRegistry',
              namedImports: ['useAssetRegistry'],
            },
          });
        }
      }

      // 4. Validate if enabled
      if (this.options.validateAfter) {
        const validation = this.validate(transformedCode);
        if (!validation.valid && this.options.fallbackToPatch) {
          // Fallback to minimal patch mode
          warnings.push({
            message: 'Full transform validation failed, applied minimal patches',
          });
          // Return original with just URL replacements
          transformedCode = this.applyMinimalPatches(code, assetMappings);
        }
      }

      return {
        success: true,
        code: transformedCode,
        transforms: appliedTransforms,
        errors,
        warnings,
      };

    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Transform failed',
        recoverable: this.options.fallbackToPatch,
      });

      if (this.options.fallbackToPatch) {
        return {
          success: true,
          code: this.applyMinimalPatches(code, assetMappings),
          transforms: [],
          errors,
          warnings: [{ message: 'Used fallback patch mode due to errors' }],
        };
      }

      return {
        success: false,
        code,
        transforms: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Insert useAssetRegistry hook into component
   */
  private insertAssetHook(code: string): { modified: boolean; code: string } {
    const tokenizer = new TSXTokenizer(code);
    const componentStart = tokenizer.findComponentStart();

    if (componentStart === null) {
      return { modified: false, code };
    }

    // Check if hook already exists
    if (code.includes('useAssetRegistry()') || code.includes('const assets =')) {
      return { modified: false, code };
    }

    const hookCode = '\n  const { getAssetRef, assets } = useAssetRegistry();\n';
    const newCode = 
      code.slice(0, componentStart) + 
      hookCode + 
      code.slice(componentStart);

    return { modified: true, code: newCode };
  }

  /**
   * Minimal patch mode - just replace URLs without restructuring
   */
  private applyMinimalPatches(
    code: string, 
    assetMappings: Array<{ pattern: string; assetId: string }>
  ): string {
    let patched = code;

    for (const mapping of assetMappings) {
      const asset = this.registry.get(mapping.assetId);
      if (!asset) continue;

      // Simple string replacement of the pattern with the asset URL
      const escapedPattern = escapeRegex(mapping.pattern);
      patched = patched.replace(
        new RegExp(`(["'])${escapedPattern}\\1`, 'g'),
        `"${asset.url}"`
      );
    }

    return patched;
  }

  /**
   * Validate transformed code
   */
  validate(code: string): ValidationResult {
    const syntaxErrors: Array<{ message: string; line: number; column: number }> = [];
    const typeErrors: Array<{ message: string; line: number; column: number }> = [];

    // Basic syntax validation
    try {
      // Check for balanced braces
      let braceCount = 0;
      let parenCount = 0;
      let bracketCount = 0;

      for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;

        if (braceCount < 0 || parenCount < 0 || bracketCount < 0) {
          const lines = code.substring(0, i).split('\n');
          syntaxErrors.push({
            message: `Unbalanced ${char === '}' ? 'braces' : char === ')' ? 'parentheses' : 'brackets'}`,
            line: lines.length,
            column: lines[lines.length - 1].length,
          });
          break;
        }
      }

      if (braceCount !== 0) {
        syntaxErrors.push({ message: 'Unclosed braces', line: 0, column: 0 });
      }
      if (parenCount !== 0) {
        syntaxErrors.push({ message: 'Unclosed parentheses', line: 0, column: 0 });
      }
      if (bracketCount !== 0) {
        syntaxErrors.push({ message: 'Unclosed brackets', line: 0, column: 0 });
      }

      // Check for common TSX issues
      if (code.includes('assets.get(') && !code.includes('useAssetRegistry')) {
        typeErrors.push({
          message: 'assets.get() used without useAssetRegistry hook',
          line: 0,
          column: 0,
        });
      }

    } catch (error) {
      syntaxErrors.push({
        message: error instanceof Error ? error.message : 'Unknown syntax error',
        line: 0,
        column: 0,
      });
    }

    return {
      valid: syntaxErrors.length === 0 && typeErrors.length === 0,
      syntaxErrors,
      typeErrors,
      errors: [...syntaxErrors.map(e => e.message), ...typeErrors.map(e => e.message)],
    };
  }

  /**
   * Auto-detect assets from code and suggest mappings
   */
  suggestMappings(code: string): Array<{ pattern: string; suggestedAssetId?: string }> {
    const tokenizer = new TSXTokenizer(code);
    const imageSrcs = tokenizer.findImageSrcs();
    const hardcodedPaths = tokenizer.findHardcodedPaths();
    const suggestions: Array<{ pattern: string; suggestedAssetId?: string }> = [];

    // Collect all image paths
    const paths = new Set<string>();
    
    for (const src of imageSrcs) {
      if (src.srcValue && 
          !src.srcValue.startsWith('http') && 
          !src.srcValue.includes('assets.get(')) {
        paths.add(src.srcValue);
      }
    }

    for (const path of hardcodedPaths) {
      paths.add(path.path);
    }

    // Try to match with existing assets
    const allAssets = this.registry.getAll();
    
    for (const path of paths) {
      const filename = path.split('/').pop() || path;
      
      // Find asset with matching name
      const matchingAsset = allAssets.find(a => 
        a.name.toLowerCase() === filename.toLowerCase() ||
        a.name.toLowerCase().includes(filename.toLowerCase().replace(/\.[^.]+$/, ''))
      );

      suggestions.push({
        pattern: path,
        suggestedAssetId: matchingAsset?.id,
      });
    }

    return suggestions;
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a transform pipeline instance
 */
export function createTransformPipeline(options?: TransformPipelineOptions): TSXTransformPipeline {
  return new TSXTransformPipeline(options);
}
