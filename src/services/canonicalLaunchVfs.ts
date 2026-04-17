import type { SiteBundleSnapshot } from '@/services/canonicalPipeline';

function rebaseAppModuleForHomePage(content: string): string {
  return content.replace(
    /(from\s+['"])\.\/([^'"]+['"])/g,
    (_match, prefix, target) => `${prefix}../${target}`,
  ).replace(
    /(import\s+['"])\.\/([^'"]+['"])/g,
    (_match, prefix, target) => `${prefix}../${target}`,
  );
}

export function mergeGeneratedVfsWithCanonicalSnapshot(
  generatedFiles: Record<string, string>,
  canonicalFiles: Record<string, string>,
  snapshot: SiteBundleSnapshot,
): Record<string, string> {
  const merged = { ...canonicalFiles };
  const registryPages = Object.values(snapshot.pageRegistry.pages);
  const homePage = registryPages.find((page) => page.isHome) || registryPages[0];
  const homeFilePath = homePage?.filePath || '/src/pages/Home.tsx';

  for (const [path, content] of Object.entries(generatedFiles)) {
    if ((path === '/src/App.tsx' || path === '/App.tsx') && canonicalFiles['/src/App.tsx']) {
      merged[homeFilePath] = rebaseAppModuleForHomePage(content);
      continue;
    }

    merged[path] = content;
  }

  return merged;
}
