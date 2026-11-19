import { ACTIONABLE, isAvailable, labelOf, normalize } from './rules';

const DISMISS = new Set([
  'Daha sonra', 'Şimdi değil', 'Hayır teşekkürler', 'Bildirimleri reddet',
  'Later', 'Not now', 'No thanks', 'Block notifications',
  'Später', 'Jetzt nicht', 'Nein danke', 'Benachrichtigungen ablehnen',
].map(normalize));

export function findNotificationDismissButtons(document: Document): HTMLElement[] {
  // Netmera uses a clickable div rather than a button in its same-origin worker frame.
  const candidates = `${ACTIONABLE}, #notification-dlg #btn-later`;
  return Array.from(document.querySelectorAll<HTMLElement>(candidates)).filter(button => {
    if (!DISMISS.has(normalize(labelOf(button))) || !isAvailable(button)) return false;
    let parent = button.parentElement;
    for (let depth = 0; parent && depth < 8; depth++, parent = parent.parentElement) {
      if (parent.matches('body, html')) break;
      const text = normalize(parent.textContent || '');
      if (text.length > 5000) continue;
      const notification = /bildirim|notifications?|benachrichtigung/.test(text);
      const request = /izin|abone|permission|allow|subscribe|zulassen|erlaub/.test(text);
      const identity = `${parent.id} ${parent.className}`;
      const popup = parent.matches('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')
        || /notification|push|netmera|onesignal|bildirim/i.test(identity)
        || document.defaultView?.getComputedStyle(parent).position === 'fixed';
      if (notification && request && popup) return true;
    }
    return false;
  });
}
