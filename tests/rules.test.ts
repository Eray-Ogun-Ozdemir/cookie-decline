import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findRejectButtons, isRejectLabel } from '../src/rules';
import { createRunner } from '../src/runner';
import { banner, page } from './helpers';

for (const label of [
  'Tümünü reddet', 'TÜMÜNÜ REDDET', 'ÇEREZLERİ REDDET', 'Yalnızca gerekli çerezler',
  'Reject all', 'Reject optional cookies', 'Necessary cookies only',
  'Alle ablehnen', 'Nur notwendige Cookies', '  Reject   all  ',
]) {
  test(`Ret seçeneğini tanır: ${label}`, () => {
    assert.equal(isRejectLabel(label), true);
    const dom = page(banner(label));
    try { assert.deepEqual(findRejectButtons(dom.window.document).map(button => button.id), ['reject']); }
    finally { dom.window.close(); }
  });
}

for (const label of ['Accept all', 'Tümünü kabul et', 'Alle akzeptieren', 'Manage preferences', 'Close', 'Reject', 'Reject all and accept marketing', 'Do not reject all', 'Accept all / Reject all']) {
  test(`Belirsiz/kabul seçeneğine dokunmaz: ${label}`, () => assert.equal(isRejectLabel(label), false));
}

const negatives: [string, string][] = [
  ['çerez bağlamı olmayan düğme', '<button>Reject all</button>'],
  ['çerezden bahseden sıradan makale', '<article><p>An article about cookies</p><button>Reject all</button></article>'],
  ['çerezden bahsetmeyen iletişim penceresi', '<div role="dialog"><p>Reject pending invitations</p><button>Reject all</button></div>'],
  ['hidden düğme', banner('Reject all', 'hidden')],
  ['disabled düğme', banner('Reject all', 'disabled')],
  ['aria-disabled düğme', banner('Reject all', 'aria-disabled="true"')],
  ['gizli kapsayıcı', `<div style="display:none">${banner()}</div>`],
  ['saydam kapsayıcı', `<div style="opacity:0">${banner()}</div>`],
  ['inert kapsayıcı', `<div inert>${banner()}</div>`],
  ['aria-hidden kapsayıcı', `<div aria-hidden="true">${banner()}</div>`],
  ['devre dışı kapsayıcı', `<div aria-disabled="true">${banner()}</div>`],
  ['dış adrese giden bağlantı', '<div class="cookie-banner"><p>Cookies</p><a href="https://example.test/delete">Reject all</a></div>'],
  ['kabul et erişilebilir etiketi', banner('Reject all', 'aria-label="Accept all"')],
];
for (const [name, markup] of negatives) {
  test(`Yanlış tıklamayı önler: ${name}`, () => {
    const dom = page(markup);
    try { assert.equal(findRejectButtons(dom.window.document).length, 0); }
    finally { dom.window.close(); }
  });
}

test('aria-label ve input değerindeki ret seçeneğini okur', () => {
  const dom = page(`<div id="onetrust-banner-sdk"><p>Cookies</p><button id="aria" aria-label="Reject all">×</button><input id="input" type="button" value="Alle ablehnen"></div>`);
  try { assert.deepEqual(findRejectButtons(dom.window.document).map(button => button.id), ['aria', 'input']); }
  finally { dom.window.close(); }
});

test('aria-labelledby üzerinden etiketi okur', () => {
  const dom = page('<div class="cookie-banner"><p>Cookies</p><span id="label">Reject all</span><button id="reject" aria-labelledby="label">×</button></div>');
  try { assert.equal(findRejectButtons(dom.window.document)[0]?.id, 'reject'); }
  finally { dom.window.close(); }
});

test('ekranda yer kaplamayan düğmeye tıklamaz', () => {
  const dom = page(banner());
  try {
    dom.window.document.querySelector<HTMLElement>('#reject')!.getClientRects = () => [] as unknown as DOMRectList;
    assert.equal(findRejectButtons(dom.window.document).length, 0);
  } finally { dom.window.close(); }
});

test('çalıştırıcı kapalıyken tıklamaz, açılınca yalnızca ret seçeneğini bir kez tıklar', () => {
  const dom = page(banner());
  try {
    const document = dom.window.document;
    let rejects = 0;
    let accepts = 0;
    document.querySelector('#reject')!.addEventListener('click', () => rejects++);
    document.querySelector('#accept')!.addEventListener('click', () => accepts++);
    const runner = createRunner(document);
    assert.equal(runner.scan(), false);
    runner.setEnabled(true);
    assert.equal(runner.scan(), true);
    assert.equal(runner.scan(), false);
    runner.setEnabled(false);
    assert.equal(runner.scan(), false);
    assert.equal(rejects, 1);
    assert.equal(accepts, 0);
  } finally { dom.window.close(); }
});
