import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const demo = await readFile(new URL('../demo/index.html', import.meta.url));
const pathToExtension = await realpath(new URL('../dist', import.meta.url));
// Unpacked extensions without a manifest key derive their ID from their absolute path.
const extensionId = createHash('sha256').update(pathToExtension).digest('hex').slice(0, 32)
  .replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)));
const profile = await mkdtemp(join(tmpdir(), 'cerez-reddet-test-'));
const output = fileURLToPath(new URL('../.test-output/', import.meta.url));
await mkdir(output, { recursive: true });
const errors = [];

async function serve() {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(demo);
  });
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

const first = await serve();
const second = await serve();
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
    viewport: { width: 1200, height: 850 },
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForFunction(() => !document.querySelector('#enabled').disabled);
  assert.equal(await popup.locator('#enabled').isChecked(), true);
  await popup.setViewportSize({ width: 360, height: 580 });
  await popup.locator('body').screenshot({ path: join(output, 'popup.png') });

  const page = await context.newPage();
  await page.goto(first.url);
  for (const language of ['tr', 'en', 'de']) {
    await page.selectOption('#language', language);
    await page.click('#show');
    await page.waitForFunction(() => document.querySelector('#result').dataset.choice === 'rejected');
    assert.equal(await page.locator('#cookie-banner').isVisible(), false);
    console.log(`PASS: ${language} ret seçeneği, gerçek eklentiyle uygulandı.`);
  }

  await page.click('#delayed');
  await page.waitForFunction(() => document.querySelector('#result').dataset.choice === 'rejected', undefined, { timeout: 5000 });
  assert.equal(await page.locator('#result').getAttribute('data-choice'), 'rejected');
  assert.equal(await page.locator('#cookie-banner').isVisible(), false);
  console.log('PASS: geç açılan pencere reddedildi.');

  await page.click('#preferences');
  await page.waitForTimeout(450);
  assert.equal(await page.locator('#cookie-banner').isVisible(), true);
  assert.equal(await page.locator('#result').getAttribute('data-choice'), 'pending');
  assert.equal(await page.locator('#unrelated-result').textContent(), 'Bu düğmeye henüz tıklanmadı.');
  console.log('PASS: tercih menüsüne, kabul et ve ilgisiz düğmelere dokunulmadı.');

  await popup.bringToFront();
  await popup.locator('#enabled').uncheck();
  await popup.waitForFunction(() => document.body.dataset.enabled === 'false');
  await page.bringToFront();
  await page.click('#show');
  await page.waitForTimeout(450);
  assert.equal(await page.locator('#cookie-banner').isVisible(), true);
  await page.screenshot({ path: join(output, 'demo.png') });
  await popup.bringToFront();
  await popup.locator('#enabled').check();
  await popup.waitForFunction(() => document.body.dataset.enabled === 'true');
  await page.bringToFront();
  await page.waitForFunction(() => document.querySelector('#result').dataset.choice === 'rejected');
  console.log('PASS: menüden aç/kapat, açık sayfada uygulandı.');

  await page.evaluate(url => {
    const frame = document.createElement('iframe');
    frame.src = url;
    frame.id = 'cross-origin-test';
    frame.style.cssText = 'width:700px;height:600px';
    document.body.append(frame);
  }, second.url);
  const frame = page.frameLocator('#cross-origin-test');
  await frame.locator('#show').click();
  await frame.locator('#result[data-choice="rejected"]').waitFor();
  console.log('PASS: farklı origin içindeki iframe penceresi reddedildi.');

  await page.reload();
  await page.click('#show');
  await page.waitForFunction(() => document.querySelector('#result').dataset.choice === 'rejected');
  assert.deepEqual(errors, []);
  console.log('PASS: sayfa yenileme sonrası eklenti çalıştı; sayfa hatası yok.');
  console.log('Tarayıcı kontrolleri geçti. Görseller: .test-output/popup.png ve .test-output/demo.png');
} finally {
  await context?.close();
  await Promise.all([new Promise(resolve => first.server.close(resolve)), new Promise(resolve => second.server.close(resolve))]);
  await rm(profile, { recursive: true, force: true });
}
