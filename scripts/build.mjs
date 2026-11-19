import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });

const options = {
  entryPoints: ['src/content.ts', 'src/popup.ts'],
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome109',
  sourcemap: true,
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const builder = await context(options);
  await builder.watch();
  console.log('TypeScript değişiklikleri izleniyor. HTML/CSS değişikliklerinde npm run build çalıştırın.');
} else {
  await build(options);
}
