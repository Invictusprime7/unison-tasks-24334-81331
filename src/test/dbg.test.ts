import { describe, it } from 'vitest';
import { mergeGeneratedVfsWithCanonicalSnapshot } from '@/services/canonicalLaunchVfs';
const routes: Record<string,string> = { '/': '/src/pages/Home.tsx', '/services': '/src/pages/Services.tsx', '/gallery': '/src/pages/Gallery.tsx', '/contact': '/src/pages/Contact.tsx' };
describe('dbg2', () => { it('y', () => {
  const registryPages: any = {}; const vfsFiles: Record<string,string> = { '/src/App.tsx': 'export default function App() { return null; }' };
  Object.entries(routes).forEach(([route, filePath], i) => { registryPages[`page_${i}`] = { pageId:`page_${i}`, title: route, path: route, filePath, isHome: route === '/' }; vfsFiles[filePath] = `export default function Page() { return <main>${route}</main>; }`; });
  const snapshot: any = { pageRegistry: { pages: registryPages, homePageId:'page_0', version:1 }, vfsFiles, routerFile:{path:'/src/App.tsx',content:vfsFiles['/src/App.tsx']}, manifest:{routes:[],nav:[]}, routes:Object.keys(routes), businessName:'Salon' };
  try { const m = mergeGeneratedVfsWithCanonicalSnapshot({ '/src/pages/Services.tsx': 'export default function Services( { return <div>' }, snapshot.vfsFiles, snapshot, 'compiler'); console.log(Object.keys(m)); } catch(e:any) { console.log('ERR', e.message); }
  try { const m2 = mergeGeneratedVfsWithCanonicalSnapshot({}, snapshot.vfsFiles, snapshot, 'compiler'); console.log('empty-gen', Object.keys(m2)); } catch(e:any) { console.log('ERR2', e.message); }
}); });
