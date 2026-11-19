import { JSDOM } from 'jsdom';

export function page(markup: string) {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    url: 'https://example.test/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  // jsdom has no layout engine. Browser layout is checked separately; this lets
  // rule tests exercise CSS/ancestor visibility and missing-rectangle behavior.
  dom.window.HTMLElement.prototype.getClientRects = function () {
    return [{ width: 120, height: 30 }] as unknown as DOMRectList;
  };
  return dom;
}

export const banner = (label = 'Reject all', attributes = '') => `
  <div class="cookie-banner" role="dialog">
    <p>We use cookies for optional analytics.</p>
    <button id="accept">Accept all</button>
    <button id="reject" ${attributes}>${label}</button>
  </div>`;

export const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));
