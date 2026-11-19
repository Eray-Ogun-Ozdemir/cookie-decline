const ACTIONABLE = 'button, a[href], [role="button"], input[type="button"], input[type="submit"]';

const CMP_CONTAINERS = [
  '#onetrust-banner-sdk',
  '#onetrust-consent-sdk',
  '#CybotCookiebotDialog',
  '#didomi-host',
  '#usercentrics-root',
  '.osano-cm-dialog',
  '[data-testid="uc-banner"]',
].join(',');

export function normalize(value: string): string {
  return value.replace(/[İIı]/g, 'i').toLowerCase().normalize('NFD')
    .replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().replace(/[.!…]+$/u, '').trim();
}

const REJECT_LABELS = new Set([
  'tümünü reddet', 'hepsini reddet', 'tüm çerezleri reddet', 'çerezleri reddet',
  'isteğe bağlı çerezleri reddet', 'zorunlu olmayan çerezleri reddet',
  'yalnızca gerekli çerezler', 'sadece gerekli çerezler',
  'yalnızca zorunlu çerezler', 'sadece zorunlu çerezler',
  'reject all', 'reject all cookies', 'reject cookies', 'decline all', 'decline all cookies',
  'reject optional cookies', 'reject non-essential cookies', 'reject nonessential cookies',
  'only necessary cookies', 'necessary cookies only', 'essential cookies only',
  'use necessary cookies only', 'continue without accepting',
  'alle ablehnen', 'alle cookies ablehnen', 'cookies ablehnen',
  'nur notwendige cookies', 'nur erforderliche cookies', 'nur essenzielle cookies',
  'nur notwendige cookies verwenden', 'ohne zustimmung fortfahren',
].map(normalize));

export function isRejectLabel(label: string): boolean {
  return REJECT_LABELS.has(normalize(label));
}

function labelOf(element: HTMLElement): string {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel !== null) return ariaLabel;
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    return labelledBy.split(/\s+/).map(id => element.ownerDocument.getElementById(id)?.textContent ?? '').join(' ');
  }
  if (element.tagName === 'INPUT') return (element as HTMLInputElement).value;
  return element.innerText || element.textContent || '';
}

export function isVisible(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view || !element.isConnected || !element.getClientRects().length) return false;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const style = view.getComputedStyle(current);
    if (current.hidden || current.hasAttribute('inert') || current.getAttribute('aria-hidden') === 'true'
      || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse'
      || style.opacity === '0' || style.pointerEvents === 'none') return false;
  }
  return true;
}

function hasCookieContext(button: HTMLElement): boolean {
  const view = button.ownerDocument.defaultView;
  if (!view) return false;
  let container = button.parentElement;
  for (let depth = 0; container && depth < 8; depth++, container = container.parentElement) {
    if (container.tagName === 'BODY' || container.tagName === 'HTML') break;
    const text = normalize(container.textContent || '');
    const hasCookieText = /\b(cookie\w*|cerez\w*)\b/.test(text);
    if (!hasCookieText || text.length > 8000) continue;
    const identifier = normalize(`${container.id} ${container.getAttribute('class') || ''}`);
    const explicitContainer = container.matches(CMP_CONTAINERS)
      || /cookie|cerez|consent/.test(identifier);
    const dialog = container.matches('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]');
    const position = view.getComputedStyle(container).position;
    if (explicitContainer || dialog || position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}

export function findRejectButtons(document: Document): HTMLElement[] {
  const results: HTMLElement[] = [];
  for (const element of document.querySelectorAll<HTMLElement>(ACTIONABLE)) {
    if (element.matches(':disabled, [disabled], [aria-disabled="true"]')
      || element.closest('[aria-disabled="true"]')
      || !isRejectLabel(labelOf(element)) || !isVisible(element) || !hasCookieContext(element)) continue;
    // A navigation link must stay on this document. Never follow a rejection-labelled external URL.
    if (element.tagName === 'A') {
      const href = element.getAttribute('href') || '';
      if (href !== '#' && !href.startsWith('#')) continue;
    }
    results.push(element);
  }
  return results;
}
