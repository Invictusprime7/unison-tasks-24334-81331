import { describe, it } from 'vitest';
import { mergeGeneratedVfsWithCanonicalSnapshot } from '@/services/canonicalLaunchVfs';
describe('dbg', () => { it('x', () => {
  const snapshot: any = { pageRegistry: { pages: { p0: { pageId:'p0', title:'Home', path:'/', filePath:'/src/pages/Home.tsx', isHome:true }, p1: { pageId:'p1', title:'S', path:'/services', filePath:'/src/pages/Services.tsx' } }, homePageId:'p0', version:1 }, vfsFiles: { '/src/App.tsx':'export default function App(){return null;}', '/src/pages/Home.tsx':'export default function Page(){return <main>h</main>;}', '/src/pages/Services.tsx':'export default function Page(){return <main>s</main>;}' }, routerFile:{path:'/src/App.tsx',content:''}, manifest:{routes:[],nav:[]}, routes:['/','/services'], businessName:'X' };
  try { const m = mergeGeneratedVfsWithCanonicalSnapshot({}, snapshot.vfsFiles, snapshot, 'compiler'); console.log(Object.keys(m)); } catch(e:any){ console.log('ERR', e.message); }
}); });
