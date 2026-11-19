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
  console.log('Watching TypeScript changes. Run npm run build after editing HTML, CSS, or the manifest.');
} else {
  await build(options);
}
