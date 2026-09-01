/**
 * AI Response Parser - Comprehensive parsing for structured AI responses
 * 
 * Extracts multiple types of structured content from AI assistant responses:
 * - File patches (<file path="...">...</file>)
 * - Code blocks (```html```, ```tsx```, etc.)
 * - Builder actions (<action type="...">...</action>)
 * - Style modifications (<style element="..." property="..." value="..."/>)
 * - Section operations (<section operation="add|remove|reorder">...</section>)
 * - Element operations (<element operation="add|modify|delete">...</element>)
 * - Intent wiring (<intent on="selector" action="intent.name" payload="..."/>)
 * - Layout changes (<layout type="grid|flex" columns="..." gap="...">...</layout>)
 */

export interface ParsedFileEdit {
  path: string;
  content: string;
}

export interface ParsedCodeBlock {
  language: string;
  content: string;
}

export interface ParsedBuilderAction {
  type: 'install_pack' | 'wire_button' | 'add_section' | 'remove_section' | 'modify_element' | 'apply_style';
  target?: string;
  params: Record<string, string>;
}

export interface ParsedStyleModification {
  selector: string;
  property: string;
  value: string;
}

export interface ParsedSectionOperation {
  operation: 'add' | 'remove' | 'reorder' | 'replace';
  sectionId?: string;
  sectionType?: string;
  position?: 'before' | 'after' | number;
  content?: string;
}

export interface ParsedElementOperation {
  operation: 'add' | 'modify' | 'delete' | 'move';
  selector?: string;
  parentSelector?: string;
  content?: string;
  attributes?: Record<string, string>;
}

export interface ParsedIntentWiring {
  selector: string;
  intent: string;
  payload?: Record<string, string>;
  label?: string;
}

export interface ParsedLayoutChange {
  selector: string;
  type: 'grid' | 'flex' | 'stack';
  columns?: number;
  gap?: string;
  align?: string;
  justify?: string;
}

export interface AIResponseParseResult {
  files: ParsedFileEdit[];
  codeBlocks: ParsedCodeBlock[];
  builderActions: ParsedBuilderAction[];
  styleModifications: ParsedStyleModification[];
  sectionOperations: ParsedSectionOperation[];
  elementOperations: ParsedElementOperation[];
  intentWirings: ParsedIntentWiring[];
  layoutChanges: ParsedLayoutChange[];
  plainText: string;
  hasStructuredContent: boolean;
}

/**
 * Parse file patches from AI response
 * Format: <file path="/path/to/file.tsx">...content...</file>
 */
function parseFileTags(input: string): ParsedFileEdit[] {
  const files: ParsedFileEdit[] = [];
  const re = /<file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/file>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const path = (match[1] || '').trim();
    const content = (match[2] || '').replace(/^\n+|\n+$/g, '');
    if (path) {
      files.push({ path, content });
    }
  }

  return files;
}

/**
 * Parse code blocks from AI response
 * Format: ```language\ncode...```
 */
function parseCodeBlocks(input: string): ParsedCodeBlock[] {
  const blocks: ParsedCodeBlock[] = [];
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const language = match[1] || 'text';
    const content = match[2].trim();
    if (content) {
      blocks.push({ language, content });
    }
  }

  return blocks;
}

/**
 * Parse builder actions from AI response
 * Format: <action type="install_pack" pack="leads"/>
 * Format: <action type="wire_button" selector=".cta-btn" intent="booking.create"/>
 */
function parseBuilderActions(input: string): ParsedBuilderAction[] {
  const actions: ParsedBuilderAction[] = [];
  const re = /<action\s+([^>]+)\/?>(?:([\s\S]*?)<\/action>)?/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const attrsStr = match[1];
    const content = match[2]?.trim() || '';
    
    const typeMatch = attrsStr.match(/type=["']([^"']+)["']/);
    if (!typeMatch) continue;
    
    const type = typeMatch[1] as ParsedBuilderAction['type'];
    const params: Record<string, string> = {};
    
    // Extract all attributes
    const attrRe = /(\w+)=["']([^"']+)["']/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(attrsStr)) !== null) {
      if (attrMatch[1] !== 'type') {
        params[attrMatch[1]] = attrMatch[2];
      }
    }
    
    if (content) {
      params.content = content;
    }
    
    actions.push({ type, params });
  }

  return actions;
}

/**
 * Parse style modifications from AI response
 * Format: <style element=".selector" property="color" value="#ff0000"/>
 */
function parseStyleModifications(input: string): ParsedStyleModification[] {
  const modifications: ParsedStyleModification[] = [];
  const re = /<style\s+element=["']([^"']+)["']\s+property=["']([^"']+)["']\s+value=["']([^"']+)["']\s*\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    modifications.push({
      selector: match[1],
      property: match[2],
      value: match[3],
    });
  }

  return modifications;
}

/**
 * Parse section operations from AI response
 * Format: <section operation="add" type="hero" position="after:features">...html...</section>
 */
function parseSectionOperations(input: string): ParsedSectionOperation[] {
  const operations: ParsedSectionOperation[] = [];
  const re = /<section\s+operation=["'](\w+)["']([^>]*)>([\s\S]*?)<\/section>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const operation = match[1] as ParsedSectionOperation['operation'];
    const attrsStr = match[2];
    const content = match[3].trim();
    
    const sectionOp: ParsedSectionOperation = { operation };
    
    // Extract section type
    const typeMatch = attrsStr.match(/type=["']([^"']+)["']/);
    if (typeMatch) sectionOp.sectionType = typeMatch[1];
    
    // Extract section id
    const idMatch = attrsStr.match(/id=["']([^"']+)["']/);
    if (idMatch) sectionOp.sectionId = idMatch[1];
    
    // Extract position
    const posMatch = attrsStr.match(/position=["']([^"']+)["']/);
    if (posMatch) {
      const posVal = posMatch[1];
      if (posVal.startsWith('before:')) {
        sectionOp.position = 'before';
        sectionOp.sectionId = posVal.replace('before:', '');
      } else if (posVal.startsWith('after:')) {
        sectionOp.position = 'after';
        sectionOp.sectionId = posVal.replace('after:', '');
      } else if (!isNaN(parseInt(posVal))) {
        sectionOp.position = parseInt(posVal);
      }
    }
    
    if (content) {
      sectionOp.content = content;
    }
    
    operations.push(sectionOp);
  }

  return operations;
}

/**
 * Parse element operations from AI response
 * Format: <element operation="modify" selector=".hero-title" attribute="class" value="text-4xl"/>
 */
function parseElementOperations(input: string): ParsedElementOperation[] {
  const operations: ParsedElementOperation[] = [];
  const re = /<element\s+operation=["'](\w+)["']([^>]*)(?:\/?>|>([\s\S]*?)<\/element>)/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const operation = match[1] as ParsedElementOperation['operation'];
    const attrsStr = match[2];
    const content = match[3]?.trim() || '';
    
    const elementOp: ParsedElementOperation = { operation };
    
    // Extract selector
    const selectorMatch = attrsStr.match(/selector=["']([^"']+)["']/);
    if (selectorMatch) elementOp.selector = selectorMatch[1];
    
    // Extract parent selector for add operations
    const parentMatch = attrsStr.match(/parent=["']([^"']+)["']/);
    if (parentMatch) elementOp.parentSelector = parentMatch[1];
    
    // Extract attributes
    const attributes: Record<string, string> = {};
    const attrMatches = attrsStr.matchAll(/(\w+)=["']([^"']+)["']/g);
    for (const attrMatch of attrMatches) {
      const name = attrMatch[1];
      if (!['operation', 'selector', 'parent'].includes(name)) {
        attributes[name] = attrMatch[2];
      }
    }
    if (Object.keys(attributes).length > 0) {
      elementOp.attributes = attributes;
    }
    
    if (content) {
      elementOp.content = content;
    }
    
    operations.push(elementOp);
  }

  return operations;
}

/**
 * Parse intent wiring commands from AI response
 * Format: <intent on=".book-btn" action="booking.create" label="Book Now" payload='{"service":"consultation"}'/>
 */
function parseIntentWirings(input: string): ParsedIntentWiring[] {
  const wirings: ParsedIntentWiring[] = [];
  const re = /<intent\s+([^>]+)\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const attrsStr = match[1];
    
    const selectorMatch = attrsStr.match(/on=["']([^"']+)["']/);
    const actionMatch = attrsStr.match(/action=["']([^"']+)["']/);
    
    if (!selectorMatch || !actionMatch) continue;
    
    const wiring: ParsedIntentWiring = {
      selector: selectorMatch[1],
      intent: actionMatch[1],
    };
    
    const labelMatch = attrsStr.match(/label=["']([^"']+)["']/);
    if (labelMatch) wiring.label = labelMatch[1];
    
    const payloadMatch = attrsStr.match(/payload=["']([^"']+)["']/);
    if (payloadMatch) {
      try {
        wiring.payload = JSON.parse(payloadMatch[1].replace(/&quot;/g, '"'));
      } catch {
        // Ignore invalid JSON
      }
    }
    
    wirings.push(wiring);
  }

  return wirings;
}

/**
 * Parse layout change commands from AI response
 * Format: <layout selector=".features" type="grid" columns="3" gap="4"/>
 */
function parseLayoutChanges(input: string): ParsedLayoutChange[] {
  const changes: ParsedLayoutChange[] = [];
  const re = /<layout\s+([^>]+)\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const attrsStr = match[1];
    
    const selectorMatch = attrsStr.match(/selector=["']([^"']+)["']/);
    const typeMatch = attrsStr.match(/type=["']([^"']+)["']/);
    
    if (!selectorMatch || !typeMatch) continue;
    
    const layout: ParsedLayoutChange = {
      selector: selectorMatch[1],
      type: typeMatch[1] as ParsedLayoutChange['type'],
    };
    
    const columnsMatch = attrsStr.match(/columns=["'](\d+)["']/);
    if (columnsMatch) layout.columns = parseInt(columnsMatch[1]);
    
    const gapMatch = attrsStr.match(/gap=["']([^"']+)["']/);
    if (gapMatch) layout.gap = gapMatch[1];
    
    const alignMatch = attrsStr.match(/align=["']([^"']+)["']/);
    if (alignMatch) layout.align = alignMatch[1];
    
    const justifyMatch = attrsStr.match(/justify=["']([^"']+)["']/);
    if (justifyMatch) layout.justify = justifyMatch[1];
    
    changes.push(layout);
  }

  return changes;
}

/**
 * Strip all structured tags from the response to get plain text
 */
function extractPlainText(input: string): string {
  return input
    // Remove file tags
    .replace(/<file\s+[^>]+>[\s\S]*?<\/file>/gi, '')
    // Remove action tags
    .replace(/<action\s+[^>]+\/?>(?:[\s\S]*?<\/action>)?/gi, '')
    // Remove style tags (our custom ones)
    .replace(/<style\s+element=[^>]+\/>/gi, '')
    // Remove section operation tags
    .replace(/<section\s+operation=[^>]+>[\s\S]*?<\/section>/gi, '')
    // Remove element operation tags
    .replace(/<element\s+operation=[^>]+(?:\/>|>[\s\S]*?<\/element>)/gi, '')
    // Remove intent tags
    .replace(/<intent\s+[^>]+\/>/gi, '')
    // Remove layout tags
    .replace(/<layout\s+[^>]+\/>/gi, '')
    // Remove code blocks
    .replace(/```[\w]*\n[\s\S]*?```/g, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parse an AI response for all structured content types
 */
export function parseAIResponse(input: string): AIResponseParseResult {
  if (!input) {
    return {
      files: [],
      codeBlocks: [],
      builderActions: [],
      styleModifications: [],
      sectionOperations: [],
      elementOperations: [],
      intentWirings: [],
      layoutChanges: [],
      plainText: '',
      hasStructuredContent: false,
    };
  }

  const files = parseFileTags(input);
  const codeBlocks = parseCodeBlocks(input);
  const builderActions = parseBuilderActions(input);
  const styleModifications = parseStyleModifications(input);
  const sectionOperations = parseSectionOperations(input);
  const elementOperations = parseElementOperations(input);
  const intentWirings = parseIntentWirings(input);
  const layoutChanges = parseLayoutChanges(input);
  const plainText = extractPlainText(input);

  const hasStructuredContent = 
    files.length > 0 ||
    codeBlocks.length > 0 ||
    builderActions.length > 0 ||
    styleModifications.length > 0 ||
    sectionOperations.length > 0 ||
    elementOperations.length > 0 ||
    intentWirings.length > 0 ||
    layoutChanges.length > 0;

  return {
    files,
    codeBlocks,
    builderActions,
    styleModifications,
    sectionOperations,
    elementOperations,
    intentWirings,
    layoutChanges,
    plainText,
    hasStructuredContent,
  };
}

/**
 * Check if a response contains specific types of structured content
 */
export function hasParseableContent(input: string): {
  hasFiles: boolean;
  hasCode: boolean;
  hasActions: boolean;
  hasStyles: boolean;
  hasSections: boolean;
  hasElements: boolean;
  hasIntents: boolean;
  hasLayouts: boolean;
} {
  return {
    hasFiles: /<file\s+path=/i.test(input),
    hasCode: /```\w*\n/.test(input),
    hasActions: /<action\s+type=/i.test(input),
    hasStyles: /<style\s+element=/i.test(input),
    hasSections: /<section\s+operation=/i.test(input),
    hasElements: /<element\s+operation=/i.test(input),
    hasIntents: /<intent\s+on=/i.test(input),
    hasLayouts: /<layout\s+selector=/i.test(input),
  };
}

/**
 * Get the primary code block from parsed results
 * Prefers html > tsx > jsx > js > ts > css > other
 */
export function getPrimaryCodeBlock(result: AIResponseParseResult): ParsedCodeBlock | null {
  const priority = ['html', 'tsx', 'jsx', 'javascript', 'js', 'typescript', 'ts', 'css'];
  
  for (const lang of priority) {
    const block = result.codeBlocks.find(b => b.language.toLowerCase() === lang);
    if (block) return block;
  }
  
  return result.codeBlocks[0] || null;
}

/**
 * Parse AI response and convert to VFS-ready format
 * Combines structured parsing with unique component generation
 */
export async function parseAIResponseToVFS(
  input: string,
  options: {
    projectName?: string;
    splitComponents?: boolean;
  } = {}
): Promise<{
  files: Record<string, string>;
  componentName: string;
  hasContent: boolean;
}> {
  // Lazy import to avoid circular dependencies
  const { transformCodeToVFS, parseOnlineWebpage, generateUniqueReactVFS } = await import('./aiWebParser');
  
  const parsed = parseAIResponse(input);
  const { projectName = 'AIGenerated', splitComponents = true } = options;
  
  // If we have file tags, use them directly
  if (parsed.files.length > 0) {
    const files: Record<string, string> = {};
    for (const file of parsed.files) {
      files[file.path] = file.content;
    }
    return {
      files,
      componentName: projectName,
      hasContent: true,
    };
  }
  
  // If we have code blocks, transform the primary one
  const primaryCode = getPrimaryCodeBlock(parsed);
  if (primaryCode) {
    const result = transformCodeToVFS(primaryCode.content, { projectName });
    return {
      files: result.files,
      componentName: result.componentName,
      hasContent: true,
    };
  }
  
  // Try to extract HTML from the response
  const htmlMatch = input.match(/<(!DOCTYPE|html|body|div)[^>]*>[\s\S]+<\/(html|body|div)>/i);
  if (htmlMatch) {
    const webContent = parseOnlineWebpage(htmlMatch[0]);
    const result = generateUniqueReactVFS(webContent, { projectName, splitComponents });
    return {
      files: result.files,
      componentName: result.componentName,
      hasContent: true,
    };
  }
  
  return {
    files: {},
    componentName: projectName,
    hasContent: false,
  };
}

/**
 * Extract unique component identifiers from AI output
 * Useful for deduplication and caching
 */
export function extractComponentSignature(code: string): string {
  // Create a signature based on structure, not content
  const normalized = code
    .replace(/\s+/g, ' ')
    .replace(/'[^']*'/g, "''")
    .replace(/"[^"]*"/g, '""')
    .replace(/\d+/g, '0')
    .trim();
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `comp_${Math.abs(hash).toString(36)}`;
}

// Re-export utilities from aiWebParser for convenience
export { 
  parseOnlineWebpage,
  parseSavedProject,
  generateUniqueReactVFS,
  transformCodeToVFS,
} from './aiWebParser';
