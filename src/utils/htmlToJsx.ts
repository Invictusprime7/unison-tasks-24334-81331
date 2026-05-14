/**
 * Convert an HTML snippet (as produced by AI element edits or contentEditable
 * serialization) into JSX-safe source. Without this, injecting raw HTML into
 * a .tsx file crashes Babel with "Expected corresponding JSX closing tag" or
 * unknown attribute errors (e.g. `class=`, `stroke-width=`, unclosed `<img>`).
 */

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// HTML attribute name → JSX attribute name (camelCase / React-specific)
const ATTR_RENAMES: Record<string, string> = {
  'class': 'className',
  'for': 'htmlFor',
  'tabindex': 'tabIndex',
  'readonly': 'readOnly',
  'maxlength': 'maxLength',
  'minlength': 'minLength',
  'colspan': 'colSpan',
  'rowspan': 'rowSpan',
  'autocomplete': 'autoComplete',
  'autoplay': 'autoPlay',
  'autofocus': 'autoFocus',
  'spellcheck': 'spellCheck',
  'contenteditable': 'contentEditable',
  'crossorigin': 'crossOrigin',
  'enctype': 'encType',
  'srcset': 'srcSet',
  'srcdoc': 'srcDoc',
  'usemap': 'useMap',
  'allowfullscreen': 'allowFullScreen',
  'frameborder': 'frameBorder',
  'novalidate': 'noValidate',
  'formnovalidate': 'formNoValidate',
  'accept-charset': 'acceptCharset',
  'http-equiv': 'httpEquiv',
};

// SVG attribute renames (not exhaustive but covers common Lucide / inline SVG)
const SVG_ATTR_RENAMES: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'flood-color': 'floodColor',
  'flood-opacity': 'floodOpacity',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor',
  'text-decoration': 'textDecoration',
  'dominant-baseline': 'dominantBaseline',
  'alignment-baseline': 'alignmentBaseline',
  'baseline-shift': 'baselineShift',
  'pointer-events': 'pointerEvents',
  'vector-effect': 'vectorEffect',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref',
  'xml:lang': 'xmlLang',
  'xml:space': 'xmlSpace',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, '\u00A0');
}

function styleStringToJsx(value: string): string {
  const decls = value.split(';').map(s => s.trim()).filter(Boolean);
  const props: string[] = [];
  for (const decl of decls) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const key = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!key) continue;
    const camel = key.startsWith('--')
      ? key
      : key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const safeVal = val.replace(/"/g, '\\"');
    const keyOut = /^[a-zA-Z_$][\w$]*$/.test(camel) ? camel : JSON.stringify(camel);
    props.push(`${keyOut}: "${safeVal}"`);
  }
  return `{{ ${props.join(', ')} }}`;
}

function renameAttr(name: string): string {
  const lower = name.toLowerCase();
  if (ATTR_RENAMES[lower]) return ATTR_RENAMES[lower];
  if (SVG_ATTR_RENAMES[lower]) return SVG_ATTR_RENAMES[lower];
  // Preserve data-* / aria-* untouched
  if (lower.startsWith('data-') || lower.startsWith('aria-')) return lower;
  return name;
}

/**
 * Convert HTML attribute list (the bit between tag name and `>`) to JSX form.
 */
function convertAttributes(attrs: string): string {
  if (!attrs.trim()) return '';
  const out: string[] = [];
  // Match: name="value" | name='value' | name={...} | name=value | name
  const re = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\{[^}]*\})|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrs)) !== null) {
    const rawName = m[1];
    const dq = m[2];
    const sq = m[3];
    const expr = m[4];
    const bare = m[5];
    const name = renameAttr(rawName);

    if (expr !== undefined) {
      out.push(`${name}=${expr}`);
      continue;
    }

    let value: string | undefined;
    if (dq !== undefined) value = dq;
    else if (sq !== undefined) value = sq;
    else if (bare !== undefined) value = bare;

    if (value === undefined) {
      // Boolean attribute (e.g. `disabled`, `checked`)
      out.push(name);
      continue;
    }

    if (name === 'style') {
      out.push(`style=${styleStringToJsx(value)}`);
      continue;
    }

    const decoded = decodeEntities(value).replace(/"/g, '&quot;');
    out.push(`${name}="${decoded}"`);
  }
  return out.length ? ' ' + out.join(' ') : '';
}

/**
 * Main entry: take a possibly-HTML snippet and return a JSX-safe equivalent.
 * - Renames HTML-only attributes (class → className, etc.)
 * - Self-closes void elements (<img>, <br>, <input>…)
 * - Converts inline `style="..."` to JSX object form
 * - Decodes basic entities in text nodes
 */
export function htmlToJsx(input: string): string {
  if (!input) return input;

  // Quick path: if there are no obvious HTML-only artefacts, return as-is.
  const looksLikeHtml = /\sclass=|\sfor=|\sstyle="|<(img|br|hr|input|meta|link|source|track|wbr|area|base|col|embed|param)\b[^>]*?(?<!\/)>/i.test(input)
    || /\b(stroke|fill|clip|stop|flood|font|text)-[a-z]+=/i.test(input);
  // We still process to be safe, but cheap.

  let out = '';
  let i = 0;
  while (i < input.length) {
    const lt = input.indexOf('<', i);
    if (lt < 0) {
      out += decodeEntities(input.slice(i));
      break;
    }
    if (lt > i) out += decodeEntities(input.slice(i, lt));

    // Comment
    if (input.startsWith('<!--', lt)) {
      const end = input.indexOf('-->', lt + 4);
      if (end < 0) { out += input.slice(lt); break; }
      out += `{/*${input.slice(lt + 4, end)}*/}`;
      i = end + 3;
      continue;
    }
    // Doctype / processing — drop
    if (input.startsWith('<!', lt) || input.startsWith('<?', lt)) {
      const end = input.indexOf('>', lt);
      if (end < 0) break;
      i = end + 1;
      continue;
    }

    // Closing tag
    if (input[lt + 1] === '/') {
      const end = input.indexOf('>', lt);
      if (end < 0) { out += input.slice(lt); break; }
      out += input.slice(lt, end + 1);
      i = end + 1;
      continue;
    }

    // Opening tag
    const end = input.indexOf('>', lt);
    if (end < 0) { out += input.slice(lt); break; }
    let inner = input.slice(lt + 1, end);
    const selfClosing = inner.endsWith('/');
    if (selfClosing) inner = inner.slice(0, -1).trimEnd();

    const nameMatch = inner.match(/^([a-zA-Z][\w:-]*)/);
    if (!nameMatch) {
      out += input.slice(lt, end + 1);
      i = end + 1;
      continue;
    }
    const tagName = nameMatch[1];
    const attrs = inner.slice(tagName.length);
    const jsxAttrs = convertAttributes(attrs);
    const isVoid = VOID_ELEMENTS.has(tagName.toLowerCase());

    if (selfClosing || isVoid) {
      out += `<${tagName}${jsxAttrs} />`;
    } else {
      out += `<${tagName}${jsxAttrs}>`;
    }
    i = end + 1;
  }

  // Suppress unused-var warning
  void looksLikeHtml;
  return out;
}
