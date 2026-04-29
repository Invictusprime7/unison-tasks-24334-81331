function extractBalancedJsonObject(text: string, startIndex: number): string {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return text.slice(startIndex);
}

export function sanitizeLauncherResponseText(rawContent: unknown): string {
  if (typeof rawContent !== 'string') return '';

  let sanitized = rawContent
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim()
    .replace(/^```json?\s*\n?/i, '')
    .replace(/^```(?:html|tsx|jsx|typescript|javascript)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  if (sanitized.startsWith('{')) {
    sanitized = extractBalancedJsonObject(sanitized, 0);
  } else {
    const firstJsonObjectIndex = sanitized.indexOf('{');
    if (firstJsonObjectIndex >= 0 && /"(files|patchPlan|edits|result|data|content)"\s*:/.test(sanitized.slice(firstJsonObjectIndex))) {
      sanitized = extractBalancedJsonObject(sanitized, firstJsonObjectIndex);
    }
  }

  return sanitized.trim();
}

export interface LauncherStructuredPayload {
  files: Record<string, string>;
  entryPoint?: string;
  siteBundle?: Record<string, unknown>;
}

function parseLauncherFilesEnvelope(content: string): {
  files: Record<string, unknown>;
  entryPoint?: unknown;
} | null {
  const match = content.match(/\{\s*"files"\s*:/);
  if (match?.index == null) return null;

  const jsonObject = extractBalancedJsonObject(content, match.index);

  try {
    const parsed = JSON.parse(jsonObject) as {
      files?: Record<string, unknown>;
      entryPoint?: unknown;
    };
    return parsed?.files && typeof parsed.files === 'object' ? parsed as {
      files: Record<string, unknown>;
      entryPoint?: unknown;
    } : null;
  } catch {
    return null;
  }
}

function normalizeLauncherFiles(files: unknown, depth = 0): Record<string, string> | null {
  const normalized: Record<string, string> = {};

  if (Array.isArray(files)) {
    for (const file of files) {
      if (!file || typeof file !== 'object') continue;

      const candidate = file as Record<string, unknown>;
      const operation = typeof candidate.operation === 'string' ? candidate.operation.toLowerCase() : 'update';
      if (operation === 'delete') continue;

      const rawPath = candidate.path ?? candidate.filename ?? candidate.filePath ?? candidate.name;
      const rawContent = candidate.content ?? candidate.code;
      if (typeof rawPath !== 'string' || typeof rawContent !== 'string' || !rawContent.trim()) continue;

      const nestedEnvelope = depth < 3 ? parseLauncherFilesEnvelope(rawContent) : null;
      if (nestedEnvelope) {
        const nestedFiles = normalizeLauncherFiles(nestedEnvelope.files, depth + 1);
        if (nestedFiles) Object.assign(normalized, nestedFiles);
        continue;
      }

      const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      normalized[normalizedPath] = sanitizeRouteHierarchy(sanitizeReactFileCode(rawContent), normalizedPath);
    }
  } else if (files && typeof files === 'object') {
    for (const [path, content] of Object.entries(files as Record<string, unknown>)) {
      if (typeof content !== 'string' || !content.trim()) continue;

      const nestedEnvelope = depth < 3 ? parseLauncherFilesEnvelope(content) : null;
      if (nestedEnvelope) {
        const nestedFiles = normalizeLauncherFiles(nestedEnvelope.files, depth + 1);
        if (nestedFiles) Object.assign(normalized, nestedFiles);
        continue;
      }

      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      normalized[normalizedPath] = sanitizeRouteHierarchy(sanitizeReactFileCode(content), normalizedPath);
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function findLauncherPayloadNode(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || depth > 4) return null;

  const node = value as Record<string, unknown>;
  if (normalizeLauncherFiles(node.files)) return node;

  const patchPlan = node.patchPlan && typeof node.patchPlan === 'object'
    ? node.patchPlan as Record<string, unknown>
    : null;
  if (patchPlan && normalizeLauncherFiles(patchPlan.files)) {
    return patchPlan;
  }

  if (normalizeLauncherFiles(node.edits)) {
    return { ...node, files: node.edits };
  }

  for (const key of ['result', 'data', 'payload', 'content', 'response']) {
    const child = node[key];
    if (typeof child === 'string') {
      const parsed = extractLauncherPayload(child);
      if (parsed) {
        return {
          files: parsed.files,
          entryPoint: parsed.entryPoint,
          siteBundle: parsed.siteBundle,
        };
      }
    }

    const found = findLauncherPayloadNode(child, depth + 1);
    if (found) return found;
  }

  return null;
}

export function normalizeLauncherEntryPoint(entryPoint: unknown): string | undefined {
  if (typeof entryPoint !== 'string' || !entryPoint.trim()) return undefined;
  return entryPoint.startsWith('/') ? entryPoint : `/${entryPoint}`;
}

export function isRenderableLauncherEntryPath(path: string): boolean {
  return /\.(tsx|jsx|ts|js)$/i.test(path) && !/\/(main|index)\.(tsx|jsx|ts|js)$/i.test(path);
}

export function resolveLauncherEntryPoint(
  files: Record<string, string>,
  preferred?: string,
): string {
  const normalizedPreferred = normalizeLauncherEntryPoint(preferred);

  if (normalizedPreferred && files[normalizedPreferred]) {
    return normalizedPreferred;
  }

  return (
    (files['/src/App.tsx'] ? '/src/App.tsx' : null) ||
    (files['/App.tsx'] ? '/App.tsx' : null) ||
    Object.keys(files).find((path) => /\/pages\/.+\.(tsx|jsx|ts|js)$/i.test(path)) ||
    Object.keys(files).find((path) => isRenderableLauncherEntryPath(path)) ||
    '/src/App.tsx'
  );
}

// ---------------------------------------------------------------------------
// Inline data scaffolder — fixes AI-generated code that references data arrays
// (products, services, testimonials, etc.) without defining them first.
// ---------------------------------------------------------------------------

const COMMON_DATA_DEFAULTS: Record<string, string> = {
  products: `const products = [\n  { id: 1, name: 'Product One', price: '29.99', description: 'A great product.' },\n  { id: 2, name: 'Product Two', price: '49.99', description: 'An even better product.' },\n  { id: 3, name: 'Product Three', price: '19.99', description: 'Our most affordable option.' },\n];`,
  items: `const items = [\n  { id: 1, name: 'Item One', description: 'First item.' },\n  { id: 2, name: 'Item Two', description: 'Second item.' },\n  { id: 3, name: 'Item Three', description: 'Third item.' },\n];`,
  services: `const services = [\n  { id: 1, name: 'Service One', description: 'Expert and professional service.', price: '$99' },\n  { id: 2, name: 'Service Two', description: 'Professional and reliable.', price: '$149' },\n  { id: 3, name: 'Service Three', description: 'Premium quality.', price: '$199' },\n];`,
  testimonials: `const testimonials = [\n  { id: 1, name: 'Alex Johnson', text: 'Absolutely love this service!', rating: 5 },\n  { id: 2, name: 'Sam Rivera', text: 'Exceeded my expectations.', rating: 5 },\n  { id: 3, name: 'Jordan Lee', text: 'Highly recommend to everyone.', rating: 4 },\n];`,
  reviews: `const reviews = [\n  { id: 1, author: 'Alex Johnson', body: 'Absolutely love this!', rating: 5 },\n  { id: 2, author: 'Sam Rivera', body: 'Exceeded my expectations.', rating: 5 },\n  { id: 3, author: 'Jordan Lee', body: 'Highly recommend.', rating: 4 },\n];`,
  team: `const team = [\n  { id: 1, name: 'Alex Johnson', role: 'Founder & CEO', bio: 'Passionate about delivering results.' },\n  { id: 2, name: 'Sam Rivera', role: 'Head of Operations', bio: 'Keeping everything running smoothly.' },\n  { id: 3, name: 'Jordan Lee', role: 'Lead Designer', bio: 'Crafting beautiful experiences.' },\n];`,
  members: `const members = [\n  { id: 1, name: 'Alex Johnson', role: 'Founder & CEO' },\n  { id: 2, name: 'Sam Rivera', role: 'Head of Operations' },\n  { id: 3, name: 'Jordan Lee', role: 'Lead Designer' },\n];`,
  teamMembers: `const teamMembers = [\n  { id: 1, name: 'Alex Johnson', role: 'Founder & CEO' },\n  { id: 2, name: 'Sam Rivera', role: 'Head of Operations' },\n  { id: 3, name: 'Jordan Lee', role: 'Lead Designer' },\n];`,
  features: `const features = [\n  { id: 1, title: 'Easy to Use', description: 'Intuitive and user-friendly.' },\n  { id: 2, title: 'Fast & Reliable', description: 'Built for performance.' },\n  { id: 3, title: 'Secure', description: 'Your data is always protected.' },\n];`,
  plans: `const plans = [\n  { id: 1, name: 'Starter', price: '$9/mo', features: ['Feature A', 'Feature B'] },\n  { id: 2, name: 'Pro', price: '$29/mo', features: ['Feature A', 'Feature B', 'Feature C'] },\n  { id: 3, name: 'Enterprise', price: '$99/mo', features: ['All features', 'Priority support'] },\n];`,
  pricingPlans: `const pricingPlans = [\n  { id: 1, name: 'Starter', price: '$9/mo', features: ['Feature A', 'Feature B'] },\n  { id: 2, name: 'Pro', price: '$29/mo', features: ['Feature A', 'Feature B', 'Feature C'] },\n  { id: 3, name: 'Enterprise', price: '$99/mo', features: ['All features', 'Priority support'] },\n];`,
  gallery: `const gallery = [\n  { id: 1, title: 'Project One', category: 'Design' },\n  { id: 2, title: 'Project Two', category: 'Development' },\n  { id: 3, title: 'Project Three', category: 'Branding' },\n];`,
  images: `const images = [\n  { id: 1, src: '/placeholder.jpg', alt: 'Image one' },\n  { id: 2, src: '/placeholder.jpg', alt: 'Image two' },\n  { id: 3, src: '/placeholder.jpg', alt: 'Image three' },\n];`,
  posts: `const posts = [\n  { id: 1, title: 'First Post', excerpt: 'An introduction to our blog.', date: '2024-01-01' },\n  { id: 2, title: 'Second Post', excerpt: 'Tips and insights from our team.', date: '2024-02-01' },\n  { id: 3, title: 'Third Post', excerpt: 'Latest news and updates.', date: '2024-03-01' },\n];`,
  blogPosts: `const blogPosts = [\n  { id: 1, title: 'First Post', excerpt: 'An introduction.', date: '2024-01-01' },\n  { id: 2, title: 'Second Post', excerpt: 'Tips and insights.', date: '2024-02-01' },\n  { id: 3, title: 'Third Post', excerpt: 'Latest updates.', date: '2024-03-01' },\n];`,
  events: `const events = [\n  { id: 1, title: 'Opening Event', date: '2024-01-15', location: 'Main Hall' },\n  { id: 2, title: 'Workshop', date: '2024-02-20', location: 'Room A' },\n  { id: 3, title: 'Annual Gala', date: '2024-03-30', location: 'Grand Ballroom' },\n];`,
  categories: `const categories = [\n  { id: 1, name: 'Category One', count: 12 },\n  { id: 2, name: 'Category Two', count: 8 },\n  { id: 3, name: 'Category Three', count: 15 },\n];`,
  menuItems: `const menuItems = [\n  { id: 1, name: 'Starter', description: 'A light beginning', price: '$8' },\n  { id: 2, name: 'Main Course', description: 'The heart of the meal', price: '$18' },\n  { id: 3, name: 'Dessert', description: 'A sweet finish', price: '$7' },\n];`,
  navItems: `const navItems = [\n  { label: 'Home', href: '/' },\n  { label: 'About', href: '/about' },\n  { label: 'Services', href: '/services' },\n  { label: 'Contact', href: '/contact' },\n];`,
  faqs: `const faqs = [\n  { id: 1, question: 'How do I get started?', answer: 'Simply sign up and follow the onboarding steps.' },\n  { id: 2, question: 'What payment methods do you accept?', answer: 'We accept all major credit cards.' },\n  { id: 3, question: 'Can I cancel anytime?', answer: 'Yes, you can cancel at any time.' },\n];`,
  partners: `const partners = [\n  { id: 1, name: 'Partner One', description: 'A trusted industry leader.' },\n  { id: 2, name: 'Partner Two', description: 'Innovating together.' },\n  { id: 3, name: 'Partner Three', description: 'Building the future.' },\n];`,
  clients: `const clients = [\n  { id: 1, name: 'Client One', industry: 'Technology' },\n  { id: 2, name: 'Client Two', industry: 'Finance' },\n  { id: 3, name: 'Client Three', industry: 'Healthcare' },\n];`,
  stats: `const stats = [\n  { id: 1, label: 'Happy Clients', value: '500+' },\n  { id: 2, label: 'Projects Done', value: '1,200+' },\n  { id: 3, label: 'Years Experience', value: '10+' },\n];`,
  steps: `const steps = [\n  { id: 1, title: 'Step One', description: 'Get started quickly.' },\n  { id: 2, title: 'Step Two', description: 'Follow the guided process.' },\n  { id: 3, title: 'Step Three', description: 'Enjoy the results.' },\n];`,
};

// Native JS identifiers that should never be treated as data variables
const SKIP_IDENTIFIERS = new Set([
  'Object', 'Array', 'Promise', 'Math', 'JSON', 'Number', 'String', 'Boolean',
  'Date', 'RegExp', 'Error', 'Map', 'Set', 'Symbol', 'Proxy', 'Reflect',
  'console', 'window', 'document', 'navigator', 'location', 'history',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
]);

function isVariableDefined(code: string, varName: string): boolean {
  // Direct declarations: const/let/var varName, const [varName,  const { varName
  if (new RegExp(`(?:const|let|var)\\s+(?:\\[\\s*${varName}\\s*[,\\]]|\\{[^}]*\\b${varName}\\b|${varName}\\s*[=;,])`).test(code)) return true;
  // Destructured function params: ({ varName }) or (varName,
  if (new RegExp(`\\(\\s*\\{[^}]*\\b${varName}\\b[^}]*\\}`).test(code)) return true;
  // Import named: import { varName }
  if (new RegExp(`import\\s+\\{[^}]*\\b${varName}\\b`).test(code)) return true;
  return false;
}

function ensureRoutesImport(code: string): string {
  if (!/\bRoute\b/.test(code) || /\bRoutes\b/.test(code)) {
    return code;
  }

  const namedImportPattern = /import\s*\{([^}]*)\}\s*from\s*['"]react-router-dom['"];?/;
  if (namedImportPattern.test(code)) {
    return code.replace(namedImportPattern, (match, importsRaw) => {
      const imports = importsRaw
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean);
      if (!imports.includes('Routes')) {
        imports.push('Routes');
      }
      return `import { ${imports.join(', ')} } from 'react-router-dom';`;
    });
  }

  const firstImport = code.match(/^import\s.+$/m);
  if (!firstImport) {
    return `import { Routes } from 'react-router-dom';\n${code}`;
  }

  const insertAt = (firstImport.index ?? 0) + firstImport[0].length;
  return `${code.slice(0, insertAt)}\nimport { Routes } from 'react-router-dom';${code.slice(insertAt)}`;
}

function wrapStandaloneRouteElements(code: string): string {
  if (!/<Route\b/.test(code) || /<Routes\b/.test(code)) {
    return code;
  }

  let next = code;

  // Wrap a consecutive block of self-closing Route elements.
  next = next.replace(
    /((?:^|\n)(?:\s*<Route\b[^>]*?\/>(?:\s*\n)?){1,})/m,
    (block) => {
      const trimmed = block.trimEnd();
      if (!trimmed) return block;
      const leading = block.match(/^\s*/)?.[0] ?? '';
      const inner = trimmed
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n');
      return `${leading}<Routes>\n${inner}\n${leading}</Routes>\n`;
    },
  );

  // Wrap a single Route node if one still remains.
  if (/<Route\b/.test(next) && !/<Routes\b/.test(next)) {
    next = next.replace(
      /(^[ \t]*)(<Route\b[\s\S]*?(?:\/>|<\/Route>))/m,
      (_full, indent, routeNode) => `${indent}<Routes>\n${indent}  ${routeNode.trim()}\n${indent}</Routes>`,
    );
  }

  return next;
}

function sanitizeRouteHierarchy(code: string, filePath?: string): string {
  if (!/\.[jt]sx?$/i.test(filePath || '/src/App.tsx')) {
    return code;
  }
  if (!/<Route\b/.test(code)) {
    return code;
  }

  let next = code;
  if (!/<Routes\b/.test(next)) {
    next = ensureRoutesImport(next);
    next = wrapStandaloneRouteElements(next);
  }

  return next;
}

/**
 * Scan a React/TSX file for `.map()` calls on undefined data variables and
 * inject inline placeholder const definitions so the file renders without errors.
 */
export function sanitizeReactFileCode(code: string): string {
  if (!code || typeof code !== 'string') return code;
  // Only process .tsx / .jsx content (heuristic: has JSX or React import)
  if (!code.includes('export default') && !code.includes('React')) return code;

  const injections: string[] = [];
  const mapPattern = /\b([a-zA-Z_]\w*)\.map\s*\(/g;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = mapPattern.exec(code)) !== null) {
    const varName = match[1];
    if (seen.has(varName) || SKIP_IDENTIFIERS.has(varName)) continue;
    seen.add(varName);

    if (!isVariableDefined(code, varName) && COMMON_DATA_DEFAULTS[varName]) {
      console.warn(`[launcherPayload] Injecting placeholder data for undefined variable: ${varName}`);
      injections.push(COMMON_DATA_DEFAULTS[varName]);
    }
  }

  let next = code;

  if (injections.length > 0) {
    const injectionBlock = injections.join('\n') + '\n\n';

    // Insert before the first top-level export default / function declaration
    const exportMatch = /^export\s+default\s+function\b|^function\s+\w+/m.exec(next);
    if (exportMatch) {
      const i = exportMatch.index;
      next = next.slice(0, i) + injectionBlock + next.slice(i);
    } else {
      // Fallback: insert after the last import line
      const importMatches = [...next.matchAll(/^import\s.+$/gm)];
      if (importMatches.length > 0) {
        const last = importMatches[importMatches.length - 1];
        const i = (last.index ?? 0) + last[0].length + 1;
        next = next.slice(0, i) + '\n' + injectionBlock + next.slice(i);
      } else {
        next = injectionBlock + next;
      }
    }
  }

  return sanitizeRouteHierarchy(next);
}

export function extractLauncherPayload(rawContent: unknown): LauncherStructuredPayload | null {
  const sanitized = sanitizeLauncherResponseText(rawContent);
  if (!sanitized || !sanitized.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(sanitized) as Record<string, unknown> & {
      entryPoint?: unknown;
      siteBundle?: Record<string, unknown>;
    };
    const payloadNode = findLauncherPayloadNode(parsed);
    if (!payloadNode) return null;

    const files = normalizeLauncherFiles(payloadNode.files);
    if (!files) return null;

    return {
      files,
      entryPoint: normalizeLauncherEntryPoint(payloadNode.entryPoint ?? parsed.entryPoint),
      siteBundle: (payloadNode.siteBundle || parsed.siteBundle) as Record<string, unknown> | undefined,
    };
  } catch {
    return null;
  }
}

export function extractLauncherFilesPayload(rawContent: unknown): Record<string, string> | null {
  return extractLauncherPayload(rawContent)?.files || null;
}
