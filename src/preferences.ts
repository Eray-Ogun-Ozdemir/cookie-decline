import { ACTIONABLE, cookieContext, isAvailable, isVisible, labelOf, normalize } from './rules';

const MANAGE = new Set([
  'Seçenekleri yönetin', 'Seçenekleri yönet', 'Tercihleri yönet', 'Tercihleri yönetin', 'Çerez ayarları',
  'Manage options', 'Manage preferences', 'Cookie settings',
  'Optionen verwalten', 'Einstellungen verwalten', 'Cookie-Einstellungen',
].map(normalize));
const SAVE = new Set([
  'Tercihleri kaydet', 'Tercihlerimi kaydet', 'Ayarları kaydet', 'Seçimleri onayla',
  'Seçimlerimi onayla', 'Seçenekleri onayla', 'Seçenekleri onaylayın', 'Kaydet ve çık',
  'Save preferences', 'Save choices', 'Confirm choices', 'Confirm my choices',
  'Auswahl bestätigen', 'Einstellungen speichern',
].map(normalize));
const CONTROLS = 'input[type="checkbox"], [role="switch"], [role="checkbox"]';
const STABLE_ROOTS = '#onetrust-consent-sdk, #CybotCookiebotDialog, #didomi-host, #usercentrics-root, .fc-consent-root, .qc-cmp2-container';

export function findManageButtons(document: Document): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(ACTIONABLE))
    .filter(button => MANAGE.has(normalize(labelOf(button))) && isAvailable(button) && cookieContext(button));
}

export function preferenceScope(button: HTMLElement): HTMLElement {
  const context = cookieContext(button)!;
  // The intro can be hidden when settings replace it in a sibling panel. Keep
  // the enclosing dialog, rather than accidentally following only the intro.
  return context.closest<HTMLElement>(STABLE_ROOTS)
    || context.closest<HTMLElement>('[role="dialog"], [role="alertdialog"], dialog')
    || context;
}

function controlTarget(control: HTMLElement): HTMLElement | null {
  if (isVisible(control)) return control;
  if (control.tagName !== 'INPUT') return null;
  return Array.from((control as HTMLInputElement).labels || []).find(isVisible) || null;
}

function controlLabel(control: HTMLElement): string {
  const aria = control.getAttribute('aria-label');
  if (aria !== null) return normalize(aria);
  if (control.getAttribute('aria-labelledby')) return normalize(labelOf(control));
  if (control.tagName === 'INPUT') {
    const labels = Array.from((control as HTMLInputElement).labels || []).map(label => label.textContent || '').join(' ');
    if (labels.trim()) return normalize(labels);
  }
  // Custom switches often place their heading beside the switch rather than inside it.
  let row = control.parentElement;
  for (let depth = 0; row && depth < 3; depth++, row = row.parentElement) {
    const text = normalize(row.textContent || '');
    if (text && text.length < 400 && row.querySelectorAll(CONTROLS).length === 1) return text;
  }
  return normalize(control.textContent || '');
}

function category(control: HTMLElement): 'necessary' | 'optional' | 'unknown' {
  const label = controlLabel(control);
  // Opt-out checkboxes have reversed meaning; never treat them as consent switches.
  if (/itiraz|\bobject\b|opt.out|do not|nicht verkaufen|satma|paylasma/.test(label)) return 'unknown';
  if (/zorunlu olmayan|gerekli olmayan|non.essential|nicht notwendig/.test(label)) return 'optional';
  if (/\b(zorunlu|gerekli|necessary|required|essential|notwendig\w*|erforderlich\w*)\b/.test(label)) return 'necessary';
  // Funding Choices exposes these as explicit consent and legitimate-interest controls.
  if (control.matches('input.fc-preference-consent, input.fc-preference-legitimate-interest')
    && control.closest('.fc-consent-root')) return 'optional';
  if (/reklam|kisisellestir|analitik|analiz|istatistik|pazarlama|performans|islevsel|mesru menfaat|advertis|marketing|analytics|personaliz|personalis|legitimate interest|berechtigte|statistik|funktional|konum/.test(label)) return 'optional';
  return 'unknown';
}

function checked(control: HTMLElement): boolean | null {
  if (control.tagName === 'INPUT') {
    const input = control as HTMLInputElement;
    return input.indeterminate ? null : input.checked;
  }
  const state = control.getAttribute('aria-checked');
  return state === 'true' ? true : state === 'false' ? false : null;
}

export type PreferenceAction = { element: HTMLElement; kind: 'disable' | 'save' };

/** Save only after every visible consent control has a known meaning and is off. */
export function nextPreferenceAction(scope: HTMLElement): PreferenceAction | null {
  if (!scope.isConnected) return null;
  if (scope.matches('[aria-busy="true"]') || Array.from(scope.querySelectorAll<HTMLElement>('[aria-busy="true"]')).some(isVisible)) return null;
  const save = Array.from(scope.querySelectorAll<HTMLElement>(ACTIONABLE))
    .find(button => SAVE.has(normalize(labelOf(button))) && isAvailable(button));
  if (!save) return null;
  let visibleControls = 0;
  let next: HTMLElement | undefined;
  for (const control of scope.querySelectorAll<HTMLElement>(CONTROLS)) {
    const target = controlTarget(control);
    if (!target) continue;
    visibleControls++;
    const kind = category(control);
    if (kind === 'necessary') continue;
    const value = checked(control);
    if (kind === 'unknown' || value === null) return null;
    if (value) {
      if (control.matches(':disabled, [disabled], [aria-disabled="true"], [readonly]') || !isAvailable(target)) return null;
      next ??= target;
    }
  }
  if (!visibleControls) return null;
  return next ? { element: next, kind: 'disable' } : { element: save, kind: 'save' };
}
