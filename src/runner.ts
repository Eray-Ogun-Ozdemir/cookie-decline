import { findRejectButtons } from './rules';

/** Click at most once per element, even if a site's banner does not disappear. */
export function createRunner(document: Document) {
  let enabled = false;
  const attempted = new WeakSet<HTMLElement>();
  return {
    setEnabled(value: boolean) { enabled = value; },
    scan(): boolean {
      if (!enabled) return false;
      const button = findRejectButtons(document).find(candidate => !attempted.has(candidate));
      if (!button) return false;
      // Mark before dispatch: the website may synchronously mutate the page during click.
      attempted.add(button);
      button.click();
      return true;
    },
  };
}
