import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRunner } from '../src/runner';
import { page } from './helpers';

function setup(extra = '', options = '') {
  const dom = page(`<div class="cookie-consent" id="consent" role="dialog">
    <p>Çerez tercihleri</p>
    <div id="intro" class="cookie-intro"><p>Çerez seçenekleri</p><button id="manage">Seçenekleri yönetin</button><button id="allow">İzin ver</button></div>
    <section id="options" hidden>
      <label>Zorunlu çerezler <input id="necessary" type="checkbox" checked disabled></label>
      <label>Reklam ve pazarlama <input id="marketing" type="checkbox" checked></label>
      <label>Analitik çerezler <input id="analytics" type="checkbox" checked></label>
      <label>Meşru menfaat <input id="legitimate" type="checkbox" checked></label>
      ${extra}<button id="save">Seçimleri onayla</button>
    </section>
    </div>${options}`);
  const document = dom.window.document;
  const input = (id: string) => document.getElementById(id) as HTMLInputElement;
  let saved = 0;
  let allowed = 0;
  document.getElementById('manage')!.addEventListener('click', () => {
    document.getElementById('intro')!.hidden = true;
    document.getElementById('options')!.hidden = false;
  });
  document.getElementById('allow')!.addEventListener('click', () => allowed++);
  document.getElementById('save')!.addEventListener('click', () => { saved++; document.getElementById('consent')!.hidden = true; });
  const runner = createRunner(document);
  runner.setEnabled(true);
  return { dom, document, runner, input, get saved() { return saved; }, get allowed() { return allowed; } };
}

test('yönet → reklam/analitik/meşru menfaat kapalı → onayla; zorunlu çerezler korunur', () => {
  const state = setup();
  try {
    for (let i = 0; i < 5; i++) assert.equal(state.runner.scan(), true);
    assert.equal(state.saved, 1);
    assert.equal(state.allowed, 0);
    assert.equal(state.input('necessary').checked, true);
    for (const id of ['marketing', 'analytics', 'legitimate']) assert.equal(state.input(id).checked, false);
    assert.equal(state.runner.scan(), false);
  } finally { state.dom.window.close(); }
});

test('Google Funding Choices gizli inputları, görünür etiketlerinden kapatır', () => {
  const dom = page(`<div class="fc-consent-root">
    <div class="fc-dialog" id="intro"><button id="manage">Seçenekleri yönetin</button></div>
    <div class="fc-dialog" id="preferences" hidden>
      <label><span>Meşru menfaat</span><input type="checkbox" class="fc-preference-legitimate-interest" aria-label="Meşru menfaat, Hizmetleri geliştirmek" checked style="opacity:0"></label>
      <label><span>İzin</span><input type="checkbox" class="fc-preference-consent" aria-label="İzin, Bilgileri bir cihazda depolamak" style="opacity:0"></label>
      <button id="save">Seçimleri onayla</button>
    </div></div>`);
  try {
    const document = dom.window.document;
    let saved = false;
    document.querySelector('#manage')!.addEventListener('click', () => {
      document.querySelector<HTMLElement>('#intro')!.hidden = true;
      document.querySelector<HTMLElement>('#preferences')!.hidden = false;
    });
    document.querySelector('#save')!.addEventListener('click', () => { saved = true; });
    const runner = createRunner(document);
    runner.setEnabled(true);
    assert.equal(runner.scan(), true);
    assert.equal(runner.scan(), true);
    assert.equal(document.querySelector<HTMLInputElement>('input')!.checked, false);
    assert.equal(runner.scan(), true);
    assert.equal(saved, true);
  } finally { dom.window.close(); }
});

for (const label of ['Notwendige Cookies', 'Erforderliche Cookies']) {
  test(`Almanca zorunlu çerez etiketi korunur: ${label}`, () => {
    const state = setup();
    try {
      state.input('necessary').parentElement!.firstChild!.textContent = label;
      for (let i = 0; i < 5; i++) assert.equal(state.runner.scan(), true);
      assert.equal(state.saved, 1);
      assert.equal(state.input('necessary').checked, true);
    } finally { state.dom.window.close(); }
  });
}

for (const extra of [
  '<label>Bilinmeyen seçenek <input type="checkbox" checked></label>',
  '<label>İtiraz et <input type="checkbox" checked></label>',
  '<label>Do not sell my data <input type="checkbox" checked></label>',
  '<label>Marketing <input type="checkbox" checked disabled></label>',
  '<div role="switch" aria-label="Analytics" aria-checked="mixed"></div>',
]) {
  test(`belirsiz veya kapatılamayan izin varken kaydetmez: ${extra.slice(0,50)}`, () => {
    const state = setup(extra);
    try {
      assert.equal(state.runner.scan(), true);
      assert.equal(state.runner.scan(), false);
      assert.equal(state.saved, 0);
      assert.equal(state.input('marketing').checked, true);
    } finally { state.dom.window.close(); }
  });
}

test('özel ARIA anahtarını yalnızca açıkken kapatır', () => {
  const state = setup('<button role="switch" aria-label="Advertising" aria-checked="true" id="custom"></button>');
  try {
    const custom = state.document.querySelector<HTMLElement>('#custom')!;
    let clicks = 0;
    custom.addEventListener('click', () => { clicks++; custom.setAttribute('aria-checked', 'false'); });
    for (let i = 0; i < 6; i++) assert.equal(state.runner.scan(), true);
    assert.equal(clicks, 1);
    assert.equal(state.saved, 1);
  } finally { state.dom.window.close(); }
});

test('site anahtarı tekrar açarsa onu döngüyle tıklamaz ve kaydetmez', () => {
  const state = setup();
  try {
    state.input('marketing').addEventListener('change', () => { state.input('marketing').checked = true; });
    assert.equal(state.runner.scan(), true);
    assert.equal(state.runner.scan(), true);
    assert.equal(state.runner.scan(), false);
    assert.equal(state.saved, 0);
  } finally { state.dom.window.close(); }
});

test('tercih paneli yüklenirken seçimleri kaydetmez', () => {
  const state = setup();
  try {
    state.document.getElementById('options')!.setAttribute('aria-busy', 'true');
    assert.equal(state.runner.scan(), true);
    assert.equal(state.runner.scan(), false);
    assert.equal(state.saved, 0);
  } finally { state.dom.window.close(); }
});

test('başka bir penceredeki kaydetme ve çerez dışı yönetim düğmesine dokunmaz', () => {
  const dom = page('<div role="dialog"><p>Account settings</p><button>Manage options</button><button>Save preferences</button><label>Marketing <input type="checkbox" checked></label></div>');
  try {
    const runner = createRunner(dom.window.document);
    runner.setEnabled(true);
    assert.equal(runner.scan(), false);
    assert.equal(dom.window.document.querySelector<HTMLInputElement>('input')!.checked, true);
  } finally { dom.window.close(); }
});

test('bildirim penceresinde Daha Sonra seçilir; İzin Ver seçilmez', () => {
  const dom = page('<div class="notification-prompt" role="dialog"><p>Haberler için bildirimlere izin ver</p><button id="later">Daha Sonra</button><button id="allow">İzin Ver</button></div>');
  try {
    let dismissed = 0;
    let allowed = 0;
    dom.window.document.getElementById('later')!.addEventListener('click', () => dismissed++);
    dom.window.document.getElementById('allow')!.addEventListener('click', () => allowed++);
    const runner = createRunner(dom.window.document);
    runner.setEnabled(true);
    assert.equal(runner.scan(), true);
    assert.equal(runner.scan(), false);
    assert.equal(dismissed, 1);
    assert.equal(allowed, 0);
  } finally { dom.window.close(); }
});

test('bildirim izni bağlamı yoksa Daha Sonra düğmesine dokunmaz', () => {
  const dom = page('<div role="dialog"><p>Randevunuzu daha sonra ayarlayın.</p><button>Daha Sonra</button></div>');
  try {
    const runner = createRunner(dom.window.document);
    runner.setEnabled(true);
    assert.equal(runner.scan(), false);
  } finally { dom.window.close(); }
});

test('Netmera çerçevesindeki özel div düğmesi tanınır', () => {
  const dom = page('<div id="notification-dlg" class="notification-wrapper"><p>Bildirimlere izin ver</p><div class="notification-buttons"><div id="btn-later">Daha Sonra</div><div id="btn-allow">İzin Ver</div></div></div>');
  try {
    let dismissed = false;
    let allowed = false;
    dom.window.document.getElementById('btn-later')!.addEventListener('click', () => { dismissed = true; });
    dom.window.document.getElementById('btn-allow')!.addEventListener('click', () => { allowed = true; });
    const runner = createRunner(dom.window.document);
    runner.setEnabled(true);
    assert.equal(runner.scan(), true);
    assert.equal(dismissed, true);
    assert.equal(allowed, false);
  } finally { dom.window.close(); }
});

test('kapalıyken bildirim ve çok adımlı akışta işlem yapmaz', () => {
  const state = setup('', '<div class="notification-prompt" role="dialog"><p>Bildirimlere izin ver</p><button>Daha Sonra</button></div>');
  try {
    state.runner.setEnabled(false);
    assert.equal(state.runner.scan(), false);
    assert.equal(state.document.getElementById('options')!.hidden, true);
    assert.equal(state.saved, 0);
  } finally { state.dom.window.close(); }
});
