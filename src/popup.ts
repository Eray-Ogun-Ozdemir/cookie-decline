export {};

const toggle = document.querySelector<HTMLInputElement>('#enabled')!;
const status = document.querySelector<HTMLElement>('#status')!;
const description = document.querySelector<HTMLElement>('#state-description')!;
const error = document.querySelector<HTMLElement>('#error')!;

function render(enabled: boolean) {
  toggle.checked = enabled;
  status.textContent = enabled ? 'Koruma açık' : 'Duraklatıldı';
  description.textContent = enabled
    ? 'Tanınan çerez pencerelerinde ret seçeneği otomatik uygulanır.'
    : 'Otomatik reddetme tüm sitelerde duraklatıldı.';
  document.body.dataset.enabled = String(enabled);
}

async function initialize() {
  try {
    const settings = await chrome.storage.local.get({ enabled: true });
    render(settings.enabled !== false);
    toggle.disabled = false;
  } catch {
    error.textContent = 'Ayar okunamadı. Eklenti menüsünü yeniden açmayı deneyin.';
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
    error.textContent = 'Ayar kaydedilemedi. Yeniden deneyin.';
  } finally {
    toggle.disabled = false;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && Object.hasOwn(changes, 'enabled')) render(changes.enabled.newValue !== false);
});

void initialize();
