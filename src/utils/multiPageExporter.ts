/**
 * MULTI-PAGE STATIC SITE EXPORTER
 * 
 * Generates static HTML files for multi-page projects with:
 * - Proper navigation links between pages
 * - nav.* intent data attributes converted to real hrefs
 * - Folder structure: index.html, about/index.html, services/index.html, etc.
 */

export interface ProjectPage {
  id: string;
  slug: string;
  title: string;
  templateId?: string;
  isHome?: boolean;
  order: number;
  html?: string;
  css?: string;
}

export interface ExportedFile {
  path: string;       // e.g., "index.html" or "about/index.html"
  content: string;    // Full HTML document
}

export interface MultiPageExportOptions {
  projectName: string;
  pages: ProjectPage[];
  baseUrl?: string;   // For absolute URLs in production
  includeNavScript?: boolean; // Include client-side nav for SPA-like behavior
}

/**
 * Convert nav intent attributes to static href attributes
 * 
 * Before: <a data-ut-intent="nav.goto" data-ut-path="/about">About</a>
 * After:  <a href="/about">About</a>
 * 
 * Before: <a data-ut-intent="nav.external" data-ut-url="https://instagram.com">IG</a>
 * After:  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">IG</a>
 * 
 * Before: <a data-ut-intent="nav.anchor" data-ut-anchor="#pricing">Pricing</a>
 * After:  <a href="#pricing">Pricing</a>
 */
export function convertNavIntentsToHrefs(html: string): string {
  // Parse and transform nav intents
  let result = html;
  
  // nav.goto → href with path
  result = result.replace(
    /<([a-z]+)([^>]*?)data-ut-intent=["']nav\.goto["']([^>]*?)data-ut-path=["']([^"']+)["']([^>]*)>/gi,
    (match, tag, pre, mid, path, post) => {
      // Remove the data attributes, add href
      const cleaned = `${pre}${mid}${post}`
        .replace(/\s*data-ut-intent=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s*data-ut-path=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag} href="${path}"${cleaned ? ' ' + cleaned : ''}>`;
    }
  );
  
  // Handle reversed order: data-ut-path before data-ut-intent
  result = result.replace(
    /<([a-z]+)([^>]*?)data-ut-path=["']([^"']+)["']([^>]*?)data-ut-intent=["']nav\.goto["']([^>]*)>/gi,
    (match, tag, pre, path, mid, post) => {
      const cleaned = `${pre}${mid}${post}`
        .replace(/\s*data-ut-intent=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s*data-ut-path=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag} href="${path}"${cleaned ? ' ' + cleaned : ''}>`;
    }
  );
  
  // nav.external → href with target="_blank"
  result = result.replace(
    /<([a-z]+)([^>]*?)data-ut-intent=["']nav\.external["']([^>]*?)data-ut-url=["']([^"']+)["']([^>]*)>/gi,
    (match, tag, pre, mid, url, post) => {
      const cleaned = `${pre}${mid}${post}`
        .replace(/\s*data-ut-intent=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s*data-ut-url=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag} href="${url}" target="_blank" rel="noopener noreferrer"${cleaned ? ' ' + cleaned : ''}>`;
    }
  );
  
  // Handle reversed order for external
  result = result.replace(
    /<([a-z]+)([^>]*?)data-ut-url=["']([^"']+)["']([^>]*?)data-ut-intent=["']nav\.external["']([^>]*)>/gi,
    (match, tag, pre, url, mid, post) => {
      const cleaned = `${pre}${mid}${post}`
        .replace(/\s*data-ut-intent=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s*data-ut-url=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag} href="${url}" target="_blank" rel="noopener noreferrer"${cleaned ? ' ' + cleaned : ''}>`;
    }
  );
  
  // nav.anchor → href with anchor
  result = result.replace(
    /<([a-z]+)([^>]*?)data-ut-intent=["']nav\.anchor["']([^>]*?)data-ut-anchor=["']([^"']+)["']([^>]*)>/gi,
    (match, tag, pre, mid, anchor, post) => {
      const cleaned = `${pre}${mid}${post}`
        .replace(/\s*data-ut-intent=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s*data-ut-anchor=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag} href="${anchor}"${cleaned ? ' ' + cleaned : ''}>`;
    }
  );
  
  // Handle reversed order for anchor
  result = result.replace(
    /<([a-z]+)([^>]*?)data-ut-anchor=["']([^"']+)["']([^>]*?)data-ut-intent=["']nav\.anchor["']([^>]*)>/gi,
    (match, tag, pre, anchor, mid, post) => {
      const cleaned = `${pre}${mid}${post}`
        .replace(/\s*data-ut-intent=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s*data-ut-anchor=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag} href="${anchor}"${cleaned ? ' ' + cleaned : ''}>`;
    }
  );
  
  // Also handle standalone data-ut-path without explicit intent (inferred nav.goto)
  result = result.replace(
    /<([a-z]+)([^>]*?)data-ut-path=["']([^"']+)["']([^>]*)>/gi,
    (match, tag, pre, path, post) => {
      // Only transform if there's no href already
      if (/href=/i.test(`${pre}${post}`)) return match;
      const cleaned = `${pre}${post}`
        .replace(/\s*data-ut-path=["'][^"']*["']\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `<${tag} href="${path}"${cleaned ? ' ' + cleaned : ''}>`;
    }
  );
  
  return result;
}

/**
 * Generate full HTML document for a page
 */
export function generatePageHTML(
  page: ProjectPage,
  options: {
    projectName: string;
    baseUrl?: string;
    customHead?: string;
    customScripts?: string;
  }
): string {
  const { projectName, baseUrl = '', customHead = '', customScripts = '' } = options;
  
  // Convert nav intents to static hrefs
  const processedHtml = convertNavIntentsToHrefs(page.html || '<div>Page content here</div>');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} | ${projectName}</title>
  <meta name="generator" content="Unison Tasks">
  ${customHead}
  <style>
    /* Reset & Base Styles */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    img { max-width: 100%; height: auto; }
    a { text-decoration: none; color: inherit; }
    
    /* Page Styles */
    ${page.css || ''}
  </style>
</head>
<body>
  ${processedHtml}
  ${customScripts}
</body>
</html>`;
}

/**
 * Generate static file structure for multi-page export
 * 
 * Returns array of files with paths like:
 * - index.html (home page with slug "/")
 * - about/index.html (page with slug "/about")
 * - services/index.html (page with slug "/services")
 */
export function exportMultiPageSite(options: MultiPageExportOptions): ExportedFile[] {
  const { projectName, pages, baseUrl = '' } = options;
  
  const files: ExportedFile[] = [];
  
  for (const page of pages) {
    // Determine file path from slug
    let filePath: string;
    if (page.slug === '/' || page.isHome) {
      filePath = 'index.html';
    } else {
      // /about → about/index.html
      const cleanSlug = page.slug.replace(/^\//, '').replace(/\/$/, '');
      filePath = `${cleanSlug}/index.html`;
    }
    
    const content = generatePageHTML(page, {
      projectName,
      baseUrl,
    });
    
    files.push({
      path: filePath,
      content,
    });
  }
  
  return files;
}

/**
 * Create a downloadable ZIP of the multi-page site
 * Uses JSZip if available, otherwise returns a manifest
 */
export async function createMultiPageZip(options: MultiPageExportOptions): Promise<Blob | null> {
  const files = exportMultiPageSite(options);
  
  // Try to use JSZip if available
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    for (const file of files) {
      zip.file(file.path, file.content);
    }
    
    return await zip.generateAsync({ type: 'blob' });
  } catch (e) {
    console.warn('JSZip not available, cannot create ZIP file:', e);
    return null;
  }
}

/**
 * Download the multi-page site as a ZIP file
 */
export async function downloadMultiPageSite(options: MultiPageExportOptions): Promise<boolean> {
  const blob = await createMultiPageZip(options);
  
  if (!blob) {
    // Fallback: download individual files or show manifest
    console.log('Export manifest:', exportMultiPageSite(options).map(f => f.path));
    return false;
  }
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.projectName.toLowerCase().replace(/\s+/g, '-')}-site.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  return true;
}
