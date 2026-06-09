// content.js

if (!window.__keyMirrorListener) {
  window.__keyMirrorListener = { active: false };
}

const KML = window.__keyMirrorListener;

function handleKey(e) {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

  chrome.runtime.sendMessage({
    type: 'KEY_EVENT',
    event: {
      type: e.type,
      key: e.key,
      code: e.code,
      keyCode: e.keyCode,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    }
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_LISTEN') {
    if (!KML.active) {
      window.addEventListener('keydown', handleKey, true);
      window.addEventListener('keyup', handleKey, true);
      KML.active = true;
    }
    sendResponse({ ok: true });
  }

  if (msg.type === 'STOP_LISTEN') {
    window.removeEventListener('keydown', handleKey, true);
    window.removeEventListener('keyup', handleKey, true);
    KML.active = false;
    sendResponse({ ok: true });
  }

  return true;
});
