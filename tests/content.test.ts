import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { build } from 'esbuild';
import { banner, delay, page } from './helpers';

let contentCode: string;
before(async () => {
  const result = await build({ entryPoints: ['src/content.ts'], bundle: true, write: false, format: 'iife', target: 'es2022' });
  contentCode = result.outputFiles[0].text;
});

function setup(markup = '', initialEnabled = true) {
  const dom = page(markup);
  const listeners = new Set<(changes: Record<string, { newValue: boolean }>, area: string) => void>();
  const runtime: { id?: string } = { id: 'extension-test' };
  Object.defineProperty(dom.window, 'chrome', { value: {
    runtime,
    storage: {
      local: { get: async () => ({ enabled: initialEnabled }) },
      onChanged: {
        addListener: (listener: typeof listeners extends Set<infer T> ? T : never) => listeners.add(listener),
        removeListener: (listener: typeof listeners extends Set<infer T> ? T : never) => listeners.delete(listener),
      },
    },
  } });
  let rejects = 0;
  let accepts = 0;
  dom.window.document.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    if (target.id === 'reject') rejects++;
    if (target.id === 'accept') accepts++;
  });
  dom.window.eval(contentCode);
  return {
    dom, runtime,
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
