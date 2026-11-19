export {};

const toggle = document.querySelector<HTMLInputElement>('#enabled')!;
const status = document.querySelector<HTMLElement>('#status')!;
const description = document.querySelector<HTMLElement>('#state-description')!;
const error = document.querySelector<HTMLElement>('#error')!;

function render(enabled: boolean) {
  toggle.checked = enabled;
  status.textContent = enabled ? 'Auto-decline on' : 'Paused';
  description.textContent = enabled
    ? 'Recognized optional consent is declined and notification prompts are dismissed.'
    : 'Automatic consent handling is paused on all sites.';
  document.body.dataset.enabled = String(enabled);
}

async function initialize() {
  try {
    const settings = await chrome.storage.local.get({ enabled: true });
    render(settings.enabled !== false);
    toggle.disabled = false;
  } catch {
    error.textContent = 'Unable to read your preferences. Try reopening the extension popup.';
  }
}

toggle.addEventListener('change', async () => {
  const value = toggle.checked;
  toggle.disabled = true;
  error.textContent = '';
  try {
    await chrome.storage.local.set({ enabled: value });
    render(value);
  } catch {
    render(!value);
    error.textContent = 'Unable to save your preference. Please try again.';
  } finally {
    toggle.disabled = false;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.hasOwn(changes, 'enabled')) render(changes.enabled.newValue !== false);
});

void initialize();
