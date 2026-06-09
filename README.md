# Key Mirror — Flyff Universe Auto Hotkeys

A Chrome/Brave extension for Flyff Universe that mirrors hotkeys across multiple tabs in real time. Useful for multi-client setups where you want actions on one tab to automatically happen on another.

Uses the Chrome DevTools Protocol (CDP) via `chrome.debugger` for trusted key injection — keys arrive as native input at the browser engine level, indistinguishable from real keypresses.

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

## Tab Selection

When you open the extension popup, the **Source** and **Target** dropdowns show **all currently open tabs** in your browser — not just Flyff Universe tabs. This means you can see and select any tab by its title.

- The **active tab** (the one you're currently on) is marked with a ★ at the top of the list
- All other open tabs are listed below it
- For the **Target** field, hold `Ctrl` while clicking to select multiple tabs at once
- If you open new tabs after the popup is already open, click the **↻ refresh** button to update the list

## Example Usage

### 1v1 Setup — Attacker + Healer

| Action | Attacker Tab | Healer Tab |
|---|---|---|
| Attack / Heal | `Num 1` → mirrors to → `Num 1` | Healer auto-heals when you attack |
| Skill / Geburah Tiphreth | `Num 2` → mirrors to → `Num 2` | Healer casts Geburah Tiphreth |

### Facetank Setup Sample — Auto Mob + Heal

| Key | Attacker Tab | Healer Tab |
|---|---|---|
| `Num 1` | Mob/Attack skill | Assist Heal Skill |
| `Num 2` | Spam skill | Healrain |

**How to set it up:**
1. Open your Attacker and Healer tabs
2. Set **Source** = Attacker tab, **Target** = Healer tab
3. Under Mirror Keys, select **All keys** (or add `Num 1`,`Num 2` and etc. specifically)
4. Click **▶ Start Mirror**
5. Play on the Source tab — only the keys you configured will fire on the Target tab(s) simultaneously.

---



## Permissions

| Permission | Reason |
|---|---|
| `tabs` | Read open tab list for source/target selection |
| `scripting` | Inject listener script into source tab |
| `debugger` | Attach CDP session to target tabs for key injection |
| `storage` | Save your configuration locally |

## Notes

- Target tabs will show a **"Chrome is being debugged"** banner — this is expected and required for trusted key injection
- Source and target tabs must not be the same tab
- Does not work on `chrome://` pages or the Chrome Web Store

## Disclaimer

This tool is intended for personal convenience. Use it wisely and at your own risk. Automating inputs in online games may violate the game's terms of service.

## License

MIT

