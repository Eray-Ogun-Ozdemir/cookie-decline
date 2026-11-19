import { createRunner } from './runner';

const runner = createRunner(document);
let enabled = false;
let disposed = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let initializing = true;
let updatedDuringInitialization = false;
let storageChanges: typeof chrome.storage.onChanged | undefined;

function extensionIsActive(): boolean {
  try {
    return typeof chrome !== 'undefined'
      && Boolean(chrome.runtime?.id && chrome.storage?.local && chrome.storage?.onChanged);
  } catch {
    // Accessing an API can itself throw after this script's extension is reloaded.
    return false;
  }
}

function stop() {
  if (disposed) return;
  disposed = true;
  enabled = false;
  runner.setEnabled(false);
  observer.disconnect();
  clearTimeout(timer);
  timer = undefined;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('pageshow', onPageShow);
  // Never look up chrome.storage during teardown: Chrome may have removed it.
  const changes = storageChanges;
  storageChanges = undefined;
  try {
    changes?.removeListener(onStorageChange);
  } catch {
    // An invalidated Chrome event cannot be detached; local work is already stopped.
  }
}

function schedule() {
  if (!enabled || disposed || timer !== undefined) return;
  if (!extensionIsActive()) { stop(); return; }
  timer = setTimeout(() => {
    timer = undefined;
    // An extension reload invalidates old content scripts; they must stop clicking.
    if (!extensionIsActive()) { stop(); return; }
    if (document.visibilityState === 'hidden') return;
    if (runner.scan()) schedule();
  }, 200);
}

const observer = new MutationObserver(schedule);

function applyEnabled(value: boolean) {
  if (disposed) return;
  if (!extensionIsActive()) { stop(); return; }
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
    attributeFilter: ['class', 'id', 'style', 'hidden', 'disabled', 'aria-hidden', 'aria-disabled', 'aria-label', 'aria-checked', 'checked', 'role', 'open', 'inert'],
  });
  schedule();
}

function onStorageChange(changes: Record<string, chrome.storage.StorageChange>, area: string) {
  if (!extensionIsActive()) { stop(); return; }
  if (area !== 'local' || !Object.hasOwn(changes, 'enabled')) return;
  if (initializing) updatedDuringInitialization = true;
  applyEnabled(changes.enabled.newValue !== false);
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') schedule();
}

function onPageShow() { schedule(); }

if (extensionIsActive()) {
  try {
    storageChanges = chrome.storage.onChanged;
    storageChanges.addListener(onStorageChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);

    chrome.storage.local.get({ enabled: true }).then(settings => {
      initializing = false;
      if (!updatedDuringInitialization) applyEnabled(settings.enabled !== false);
    }).catch(stop);
  } catch {
    stop();
  }
} else {
  stop();
}
