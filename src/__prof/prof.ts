import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
const raw = JSON.parse(await Bun.file('/tmp/draft.json').text())[0];
const files = raw.vfs_files as Record<string,string>;
console.log('files', Object.keys(files).length, 'chars', Object.values(files).join('').length);
const t=Date.now();
const out = prepareSandpackFiles(files, { entryPoint: '/src/main.tsx' });
console.log('ms', Date.now()-t, 'out', Object.keys(out).length);
