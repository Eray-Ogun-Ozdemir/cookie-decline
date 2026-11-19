import { createRunner } from './runner';

const runner = createRunner(document);
let enabled = false;
let disposed = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let initializing = true;
let updatedDuringInitialization = false;

function stop() {
  disposed = true;
  enabled = false;
  runner.setEnabled(false);
  observer.disconnect();
  clearTimeout(timer);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pageshow', onPageShow);
  chrome.storage.onChanged.removeListener(onStorageChange);
}

function schedule() {
  if (!enabled || disposed || timer !== undefined) return;
  timer = setTimeout(() => {
    timer = undefined;
    // An extension reload invalidates old content scripts; they must stop clicking.
    if (!chrome.runtime?.id) { stop(); return; }
    if (document.visibilityState === 'hidden') return;
    if (runner.scan()) schedule();
  }, 200);
}

const observer = new MutationObserver(schedule);

function applyEnabled(value: boolean) {
  if (disposed) return;
  enabled = value;
  runner.setEnabled(value);
  observer.disconnect();
  clearTimeout(timer);
  timer = undefined;
  if (!value) return;
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'disabled', 'aria-hidden', 'aria-disabled', 'aria-label', 'open', 'inert'],
  });
  schedule();
}

function onStorageChange(changes: Record<string, chrome.storage.StorageChange>, area: string) {
  if (area !== 'local' || !Object.hasOwn(changes, 'enabled')) return;
  if (initializing) updatedDuringInitialization = true;
  applyEnabled(changes.enabled.newValue !== false);
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') schedule();
}

function onPageShow() { schedule(); }

chrome.storage.onChanged.addListener(onStorageChange);
document.addEventListener('visibilitychange', onVisibilityChange);
window.addEventListener('pageshow', onPageShow);

chrome.storage.local.get({ enabled: true }).then(settings => {
  initializing = false;
  if (!updatedDuringInitialization) applyEnabled(settings.enabled !== false);
}).catch(stop);
