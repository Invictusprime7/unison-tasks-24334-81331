import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { parse } from '@babel/parser';
const vfs = JSON.parse(await Bun.file('/tmp/rev/vfs.json').text());
const out = prepareSandpackFiles(vfs, { entryPoint: '/src/App.tsx' });
let bad = 0;
for (const [p, s] of Object.entries(out)) {
  if (!/\.(tsx|ts|jsx|js)$/.test(p) || typeof s !== 'string') continue;
  try { parse(s, { sourceType: 'module', plugins: ['typescript', 'jsx'] }); } catch (e: any) { bad++; console.log('FAIL', p, e.message.split('\n')[0]); }
}
const home = out['/pages/Home.tsx'] || '';
console.log('parse failures:', bad);
console.log('remaining token overrides in Home:', (home.match(/['"`]--(primary|background|foreground|card|muted|border|accent|radius)/g) || []).length);
console.log('remaining data-attr class literals:', (home.match(/['"`]data-[a-z-]+=/g) || []).length);
