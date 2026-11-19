import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const demo = await readFile(new URL('../demo/index.html', import.meta.url));
const previewMode = process.argv.includes('--preview');
const port = previewMode ? 4174 : 4173;
let previewCode;
if (previewMode) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/preview.ts', import.meta.url))],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2022',
  });
  previewCode = result.outputFiles[0].text;
}
const server = createServer((request, response) => {
  if (previewMode && request.url === '/preview.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(previewCode);
    return;
  }
  if (request.url !== '/' && request.url !== '/index.html') {
    response.writeHead(404).end('Bulunamadı');
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(previewMode
    ? demo.toString().replace('</head>', '<script src="/preview.js" defer></script></head>')
    : demo);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`${previewMode ? 'Kurulumsuz önizleme' : 'Eklenti test sayfası'}: http://127.0.0.1:${port} — kapatmak için Ctrl+C`));
