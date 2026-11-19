# Cookie Decline

**Say no to optional cookies. Keep browsing.**

Cookie Decline is a Chrome extension that declines supported cookie consent requests, turns off recognized optional consent settings, and dismisses supported website notification prompts. It runs locally in your browser using TypeScript, HTML, CSS, and Manifest V3.

The interface is in English. Consent detection supports **English, German, and Turkish**.

## Features

- Clicks recognized rejection options such as **Reject all**, **Alle ablehnen**, and **Tümünü reddet** within a cookie consent interface.
- Opens supported **Manage options** screens, switches off recognized optional consent and legitimate-interest settings, and saves the selection while preserving necessary cookies.
- Supports Google Funding Choices consent controls, including controls operated through their visible labels.
- Dismisses supported website notification prompts using **Not now**, **Jetzt nicht**, or **Daha Sonra**, including Netmera's custom control inside a matching frame.
- Detects consent interfaces that appear after the initial page load and runs in matching HTTP/HTTPS frames.
- Includes a global on/off switch, an install-free preview, and automated browser tests.

## Get started

Requirements: **Node.js 20 or later**, npm, and Chrome to run the extension. Any modern browser can open the install-free preview.

Open this project folder in VS Code, then open **Terminal → New Terminal**:

```sh
npm ci
npm run check
```

`npm ci` installs the dependencies pinned in the lockfile. `npm run check` runs type checking, automated tests, and the production build.

## Preview without installing

```sh
npm run preview
```

Open **http://127.0.0.1:4174** in your browser. The preview runs the same consent rules on the example page without installing an extension.

Use the language selector and try:

- **Show cookie banner** for a direct rejection.
- **Show after 2 seconds** for a delayed prompt.
- **Manage options flow** for a consent settings screen.
- **Show both prompts** for a notification request and cookie consent prompt together.
- The on/off switch to pause and resume automation.

The preview only affects its own example page. Chrome permissions, the extension popup, and behavior on other websites require the extension or the browser test suite.

## Install in Chrome

1. Run `npm run build` to generate the `dist` folder.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project's **dist** folder.
5. Pin **Cookie Decline** to the toolbar and reload any websites that were already open.

The extension is enabled by default. The popup switch pauses or resumes automation across all sites, including open pages with an active content script.

## Test the installed extension

```sh
npm run demo
```

Open **http://127.0.0.1:4173** in Chrome. Unlike the install-free preview, this page relies on the installed extension to perform automatic actions.

- Test direct rejection in all three languages. The result should say **Declined**.
- Test a delayed banner.
- Pause the extension and show a banner: it should remain open. Resume automation: it should be declined.
- Run **Manage options flow**: advertising, analytics, and legitimate-interest settings should be off when saved; necessary cookies should remain enabled.
- Run **Show both prompts**: the notification request should be dismissed, and optional cookie settings should be declined.
- Verify that the unrelated **Reject all** button outside the consent interface is never clicked automatically.

The example page does not create real cookies, request native notification permission, or send tracking requests. Real websites may remember previous consent choices and stop displaying their consent interface.

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch and rebuild TypeScript changes. |
| `npm run typecheck` | Check TypeScript types. |
| `npm test` | Run consent rules and lifecycle tests. |
| `npm run build` | Build the extension into `dist`. |
| `npm run check` | Run type checking, tests, and the build. |
| `npm run preview` | Start the install-free preview on port 4174. |
| `npm run demo` | Start the installed-extension demo on port 4173. |
| `npm run test:browser` | Test the extension in a separate Chromium profile. |

After changing HTML, CSS, or the manifest, run `npm run build`. Then reload the extension at `chrome://extensions` and refresh the website being tested. The TypeScript watcher does not automatically copy changes from `public`.

VS Code build, check, demo, and preview tasks are also available.

### Browser tests

Install the test browser once:

```sh
npx playwright install chromium --no-shell
```

Then run:

```sh
npm run test:browser
```

The suite loads the extension into a separate temporary Chromium profile. It checks all three consent languages, multi-step preferences, stacked prompts, delayed banners, the popup switch, matching frames, unrelated controls, and stale-script cleanup after an extension reload. Screenshots are written to `.test-output`.

The setup follows Playwright's [Chrome extension testing guide](https://playwright.dev/docs/chrome-extensions).

### Reloading and troubleshooting

Reloading an extension invalidates its old content scripts on open pages. Refresh those pages to activate the current version. Version 0.2.1 handles invalidated or missing extension APIs by stopping the old script safely.

Chrome's **Errors** screen may retain entries from an earlier build. After rebuilding, reloading the extension, and refreshing the website, use **Clear all** to remove old entries. Investigate any errors that appear again.

### Adding support for another consent interface

Add explicit labels and contextual checks in `src/rules.ts`, `src/preferences.ts`, or `src/notifications.ts`. Add tests for both the intended action and similar-looking unrelated controls. Avoid generic text matching that could click buttons outside a consent interface.

## Privacy and permissions

- The `storage` permission stores the global on/off preference on your device.
- Content scripts run on HTTP/HTTPS pages to inspect consent interfaces and operate supported controls. Chrome may describe this as access to website data.
- The extension has no backend, account requirement, AI API integration, telemetry, or outbound data reporting.
- Browsing history and page content are not recorded or sent to a server by the extension.

## Current limitations

- Website coverage is limited to recognized labels, contexts, and controls. Shadow DOM and arbitrary consent interfaces are not supported.
- Preference flows stop when a control's meaning or state is unknown, an optional setting cannot be disabled, or the flow exceeds 30 seconds or 100 actions.
- Necessary cookies are preserved. Reversed opt-out or objection checkboxes are not changed automatically.
- Each action is attempted once per element to prevent repeated clicking. Some websites reuse existing controls when reopening a consent interface.
- Notification dismissal postpones a website's request. It does not permanently block notifications or operate Chrome's native permission dialogs.
- The extension uses the website's own controls. It does not independently verify that the site honors the recorded choice or stops all tracking.
- It does not delete existing cookies or block network requests.
- Chrome's internal pages and other pages where extensions are restricted are not supported.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/rules.ts` | Rejection labels, visibility checks, and consent context detection. |
| `src/runner.ts` | Action ordering, workflow state, and repeat-click prevention. |
| `src/preferences.ts` | Multi-step consent settings and safe selection saving. |
| `src/notifications.ts` | Website notification prompt dismissal. |
| `src/content.ts` | Page observation, settings updates, and extension lifecycle handling. |
| `src/popup.ts`, `public/popup.*` | The extension popup. |
| `src/preview.ts` | The install-free preview adapter. |
| `public/manifest.json` | Chrome extension configuration. |
| `demo/index.html` | The interactive example page. |
| `scripts/` | Build, local server, and browser testing tools. |
| `tests/` | Automated behavior tests. |

## References

- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
- [Debug Chrome extensions](https://developer.chrome.com/docs/extensions/get-started/tutorial/debug)
