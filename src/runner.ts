import { findRejectButtons } from './rules';
import { findNotificationDismissButtons } from './notifications';
import { findManageButtons, nextPreferenceAction, preferenceScope } from './preferences';

/** Click at most once per element, even if a site's banner does not disappear. */
export function createRunner(document: Document) {
  let enabled = false;
  const attempted = new WeakMap<HTMLElement, Set<string>>();
  let flow: { scope: HTMLElement; started: number; steps: number } | undefined;

  function hasAttempted(element: HTMLElement, kind: string): boolean {
    return attempted.get(element)?.has(kind) || false;
  }

  function click(element: HTMLElement, kind: string): boolean {
    if (hasAttempted(element, kind)) return false;
    const kinds = attempted.get(element) || new Set<string>();
    kinds.add(kind);
    attempted.set(element, kinds);
    element.click();
    return true;
  }

  return {
    setEnabled(value: boolean) { enabled = value; },
    scan(): boolean {
      if (!enabled) return false;
      const dismiss = findNotificationDismissButtons(document).find(button => !hasAttempted(button, 'dismiss'));
      if (dismiss) return click(dismiss, 'dismiss');

      const reject = findRejectButtons(document).find(button => !hasAttempted(button, 'reject'));
      if (reject) {
        if (flow?.scope.contains(reject)) flow = undefined;
        return click(reject, 'reject');
      }

      if (flow && (!flow.scope.isConnected || Date.now() - flow.started > 30_000 || flow.steps >= 100)) flow = undefined;
      if (flow) {
        const action = nextPreferenceAction(flow.scope);
        if (!action || hasAttempted(action.element, action.kind)) return false;
        flow.steps++;
        if (action.kind === 'save') flow = undefined;
        return click(action.element, action.kind);
      }

      const manage = findManageButtons(document).find(button => !hasAttempted(button, 'manage'));
      if (!manage) return false;
      // Keep a CMP-specific scope so another dialog can never inherit a save action.
      flow = { scope: preferenceScope(manage), started: Date.now(), steps: 0 };
      return click(manage, 'manage');
    },
  };
}
