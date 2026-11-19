import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { build } from 'esbuild';
import { banner, delay, page } from './helpers';

let contentCode: string;
before(async () => {
  const result = await build({ entryPoints: ['src/content.ts'], bundle: true, write: false, format: 'iife', target: 'es2022' });
  contentCode = result.outputFiles[0].text;
});

function setup(markup = '', initialEnabled = true, options: { readFails?: boolean; detachThrows?: boolean } = {}) {
  const dom = page(markup);
  const listeners = new Set<(changes: Record<string, { newValue: boolean }>, area: string) => void>();
  const runtime: { id?: string } = { id: 'extension-test' };
  const api = {
    runtime,
    storage: {
      local: { get: async () => {
        if (options.readFails) throw new Error('Extension context invalidated.');
        return { enabled: initialEnabled };
      } },
      onChanged: {
        addListener: (listener: typeof listeners extends Set<infer T> ? T : never) => listeners.add(listener),
        removeListener: (listener: typeof listeners extends Set<infer T> ? T : never) => {
          if (options.detachThrows) throw new Error('Extension context invalidated.');
          listeners.delete(listener);
        },
      },
    },
  };
  Object.defineProperty(dom.window, 'chrome', { value: api });
  const errors: string[] = [];
  dom.window.addEventListener('error', event => {
    errors.push(event.message);
    event.preventDefault();
  });
  let rejects = 0;
  let accepts = 0;
  dom.window.document.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    if (target.id === 'reject') rejects++;
    if (target.id === 'accept') accepts++;
  });
  dom.window.eval(contentCode);
  return {
    dom, runtime, errors,
    removeStorage() { Reflect.deleteProperty(api, 'storage'); },
    get listenerCount() { return listeners.size; },
    get rejects() { return rejects; },
    get accepts() { return accepts; },
    setEnabled(value: boolean) { for (const listener of listeners) listener({ enabled: { newValue: value } }, 'local'); },
  };
}

test('ilk sayfa yüklemesinde ret düğmesini bulur', async () => {
  const state = setup(banner());
  try {
    await delay();
    assert.equal(state.rejects, 1);
    assert.equal(state.accepts, 0);
  } finally { state.dom.window.close(); }
});

test('sonradan eklenen ve görünür yapılan pencereleri yakalar', async () => {
  const state = setup();
  try {
    await delay();
    state.dom.window.document.body.innerHTML = `<div id="wrapper" hidden>${banner()}</div>`;
    await delay();
    assert.equal(state.rejects, 0);
    state.dom.window.document.querySelector<HTMLElement>('#wrapper')!.hidden = false;
    await delay();
    assert.equal(state.rejects, 1);
  } finally { state.dom.window.close(); }
});

test('ayar kapalı başlarsa bekler; açma ve yeniden kapatma açık sayfaya uygulanır', async () => {
  const state = setup(banner(), false);
  try {
    await delay();
    assert.equal(state.rejects, 0);
    state.setEnabled(true);
    await delay();
    assert.equal(state.rejects, 1);
    state.setEnabled(false);
    state.dom.window.document.body.innerHTML = banner();
    await delay();
    assert.equal(state.rejects, 1);
  } finally { state.dom.window.close(); }
});

test('kapatma işlemi sırada bekleyen otomatik tıklamayı iptal eder', async () => {
  const state = setup(banner());
  try {
    await delay(20);
    state.setEnabled(false);
    await delay();
    assert.equal(state.rejects, 0);
  } finally { state.dom.window.close(); }
});

test('eklenti yeniden yüklendiğinde eski içerik betiği tıklamayı bırakır', async () => {
  const state = setup();
  try {
    await delay();
    state.runtime.id = undefined;
    state.dom.window.document.body.innerHTML = banner();
    await delay();
    assert.equal(state.rejects, 0);
  } finally { state.dom.window.close(); }
});

test('yeniden yüklemede storage kaybolursa hata vermeden durur', async () => {
  const state = setup(banner());
  try {
    await delay(20);
    state.runtime.id = undefined;
    state.removeStorage();
    await delay();
    assert.deepEqual(state.errors, []);
    assert.equal(state.rejects, 0);
    assert.equal(state.listenerCount, 0);
    state.dom.window.document.body.innerHTML = banner();
    await delay();
    assert.equal(state.rejects, 0);
  } finally { state.dom.window.close(); }
});

test('Chrome olay dinleyicisi kaldırılırken bağlam geçersizleşse de temizliği tamamlar', async () => {
  const state = setup(banner(), true, { detachThrows: true });
  try {
    await delay(20);
    state.runtime.id = undefined;
    await delay();
    assert.deepEqual(state.errors, []);
    assert.equal(state.rejects, 0);
  } finally { state.dom.window.close(); }
});

test('storage okunamazsa otomatik tıklamayı başlatmaz', async () => {
  const state = setup(banner(), true, { readFails: true });
  try {
    await delay();
    assert.deepEqual(state.errors, []);
    assert.equal(state.rejects, 0);
    assert.equal(state.listenerCount, 0);
  } finally { state.dom.window.close(); }
});

test('Chrome eklenti API’leri olmayan ortamda hata üretmez ve tıklamaz', async () => {
  const dom = page(banner());
  try {
    let clicks = 0;
    dom.window.document.addEventListener('click', () => clicks++);
    assert.doesNotThrow(() => dom.window.eval(contentCode));
    await delay();
    assert.equal(clicks, 0);
  } finally { dom.window.close(); }
});
