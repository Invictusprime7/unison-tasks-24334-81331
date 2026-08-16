import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
const files = JSON.parse(await Bun.file('/tmp/draft.json').text())[0].vfs_files as Record<string,string>;
const out = prepareSandpackFiles(files, { entryPoint: '/src/main.tsx' });
await Bun.write(process.argv[2], JSON.stringify(out, null, 0));
