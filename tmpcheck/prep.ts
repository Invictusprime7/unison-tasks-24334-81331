import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { parse } from '@babel/parser';
const vfs = JSON.parse(await Bun.file('/tmp/rev/vfs.json').text());
let out: Record<string,string>;
try { out = prepareSandpackFiles(vfs, { entryPoint: '/src/App.tsx' }); }
catch (e) { console.log('THREW:', (e as Error).message.slice(0,600)); process.exit(0); }
console.log('out files:', Object.keys(out).length);
let bad=0;
for (const [p, src] of Object.entries(out)) {
  if (!/\.(tsx|ts|jsx|js)$/.test(p) || typeof src !== 'string') continue;
  try { parse(src, { sourceType:'module', plugins:['typescript','jsx'] }); }
  catch(e:any){ bad++; console.log('FAIL', p, '::', e.message.split('\n')[0]); }
}
console.log('post-prep parse failures:', bad);
await Bun.write('/tmp/rev/out.json', JSON.stringify(out));
