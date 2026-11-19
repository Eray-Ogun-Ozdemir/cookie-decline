import { createRunner } from './runner';

// This adapter runs the real rejection rules on the demo page without using any
// extension APIs or affecting another website. It is not bundled into dist.
const controls = document.querySelector<HTMLElement>('#preview-controls')!;
const toggle = document.querySelector<HTMLInputElement>('#preview-enabled')!;
const status = document.querySelector<HTMLElement>('#preview-status')!;
const intro = document.querySelector<HTMLElement>('#intro')!;
controls.hidden = false;
intro.textContent = 'Try it without installing an extension. Choose a consent language and show a banner. Use the switch above to pause or resume automation.';
document.title = 'Cookie Decline · Install-free preview';

const runner = createRunner(document);
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule() {
  if (!toggle.checked || timer !== undefined) return;
  timer = setTimeout(() => {
    timer = undefined;
    if (runner.scan()) schedule();
  }, 200);
}

const observer = new MutationObserver(schedule);

function update() {
  runner.setEnabled(toggle.checked);
  observer.disconnect();
  clearTimeout(timer);
  timer = undefined;
  status.textContent = toggle.checked ? 'On' : 'Paused';
  if (!toggle.checked) return;
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'style', 'hidden', 'disabled', 'aria-hidden', 'aria-disabled', 'aria-label', 'aria-checked', 'checked', 'role', 'open', 'inert'],
  });
  schedule();
}

toggle.addEventListener('change', update);
update();
