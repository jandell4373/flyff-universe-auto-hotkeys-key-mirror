# Key Mirror

A Chrome/Brave extension that mirrors keypresses from one browser tab to one or more other tabs in real time. Useful for multi-client setups where you want actions on one tab to be reflected on others.

Uses the Chrome DevTools Protocol (CDP) via `chrome.debugger` for trusted key injection — keys arrive as native input at the browser engine level.

## Features

- **Mirror Keys** — press a key on your source tab and it fires on all target tabs instantly
- **Specific key filtering** — mirror all keys or only selected keys with modifier support (Ctrl, Alt, Shift)
- **Multiple target tabs** — mirror to 2, 3, or more tabs simultaneously
- **Key hold support** — mirror respects natural hold duration (keydown/keyup forwarded separately)
- **Auto-Repeat Keys** — fire a key on target tabs at a set interval automatically
- **Hold duration per auto key** — set how long each auto key is held down before release
- **Persistent config** — your setup saves automatically and restores when you reopen the popup

## Installation

This extension is not on the Chrome Web Store. Install it manually:

1. Download or clone this repository
2. Open Chrome or Brave and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the extension folder

## Usage

### Mirror Keys

1. Open the extension popup
2. Select the **Source tab** (the tab you're actively using)
3. Select one or more **Target tabs** — hold `Ctrl` to select multiple
4. Choose **All keys** to mirror everything, or **Specific keys** to add individual key combos
5. Click **▶ Start Mirror**

To stop, click **■ Stop Mirror**.

### Auto-Repeat Keys

1. Select one or more **Target tabs**
2. Pick a modifier and key from the dropdowns
3. Set the **interval** (how often the key fires, in ms)
4. Set the **hold** duration (how long the key is held per press — `0` for a tap)
5. Click **Add**, then **▶ Start Auto**

### Notes

- The target tab(s) will show a **"Chrome is being debugged"** banner — this is expected and required for trusted key injection. It cannot be hidden.
- Keys injected via CDP are `isTrusted: true` at the browser level, meaning they are indistinguishable from real keypresses at the page/application level.
- Source and target tabs must not be the same tab.
- Extension does not work on `chrome://` pages or the Chrome Web Store.

## Permissions

| Permission | Reason |
|---|---|
| `tabs` | Read open tab list for source/target selection |
| `scripting` | Inject listener script into source tab |
| `debugger` | Attach CDP session to target tabs for key injection |
| `storage` | Save your configuration locally |

## License

MIT
