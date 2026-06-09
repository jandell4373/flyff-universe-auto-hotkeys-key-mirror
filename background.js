// background.js

let mirrorConfig = {
  sourceTabId: null,
  targetTabIds: [],
  keys: [],
  mode: 'all',
  enabled: false
};

let autoConfig = {
  targetTabIds: [],
  autoKeys: [],
  enabled: false
};

let debuggerSessions = {};
let autoIntervals = {};

async function attachDebugger(tabId) {
  if (debuggerSessions[tabId]) return true;
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    debuggerSessions[tabId] = true;
    return true;
  } catch (e) {
    console.error('attach failed for tab', tabId, e.message);
    return false;
  }
}

async function detachDebugger(tabId) {
  if (!tabId || !debuggerSessions[tabId]) return;
  try { await chrome.debugger.detach({ tabId }); } catch (e) {}
  delete debuggerSessions[tabId];
}

async function ensureDebuggers(tabIds) {
  for (const tabId of tabIds) await attachDebugger(tabId);
}

async function releaseDebuggers(tabIds) {
  for (const tabId of tabIds) {
    const usedByMirror = mirrorConfig.enabled && mirrorConfig.targetTabIds.includes(tabId);
    const usedByAuto   = autoConfig.enabled   && autoConfig.targetTabIds.includes(tabId);
    if (!usedByMirror && !usedByAuto) await detachDebugger(tabId);
  }
}

const MODIFIER_KEYS = {
  ctrl:  { key: 'Control', code: 'ControlLeft', keyCode: 17 },
  alt:   { key: 'Alt',     code: 'AltLeft',     keyCode: 18 },
  shift: { key: 'Shift',   code: 'ShiftLeft',   keyCode: 16 },
};

function buildModifiers(ev) {
  let m = 0;
  if (ev.altKey)   m |= 1;
  if (ev.ctrlKey)  m |= 2;
  if (ev.metaKey)  m |= 4;
  if (ev.shiftKey) m |= 8;
  return m;
}

function buildEvent(ev, type) {
  return {
    type,
    modifiers: buildModifiers(ev),
    windowsVirtualKeyCode: ev.keyCode,
    nativeVirtualKeyCode: ev.keyCode,
    key: ev.key,
    code: ev.code,
    autoRepeat: false,
    isKeypad: false,
    isSystemKey: false,
    location: 0
  };
}

async function sendKey(tabId, params) {
  if (!debuggerSessions[tabId]) return;
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', params);
  } catch (e) {}
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fireKey(tabId, ev, holdMs = 0) {
  if (!tabId || !debuggerSessions[tabId]) return;

  const mods = [];
  if (ev.ctrlKey)  mods.push(MODIFIER_KEYS.ctrl);
  if (ev.altKey)   mods.push(MODIFIER_KEYS.alt);
  if (ev.shiftKey) mods.push(MODIFIER_KEYS.shift);

  const modBits = buildModifiers(ev);

  for (const mod of mods) {
    await sendKey(tabId, {
      type: 'keyDown', modifiers: modBits,
      key: mod.key, code: mod.code,
      windowsVirtualKeyCode: mod.keyCode, nativeVirtualKeyCode: mod.keyCode,
      autoRepeat: false, isKeypad: false, isSystemKey: false, location: 1
    });
  }

  await sendKey(tabId, buildEvent(ev, 'keyDown'));
  await sendKey(tabId, buildEvent(ev, 'rawKeyDown'));

  if (!ev.ctrlKey && !ev.altKey && ev.key.length === 1) {
    await sendKey(tabId, {
      ...buildEvent(ev, 'char'), type: 'char',
      text: ev.key, unmodifiedText: ev.key.toLowerCase()
    });
  }

  if (holdMs > 0) await sleep(holdMs);

  await sendKey(tabId, buildEvent(ev, 'keyUp'));

  for (const mod of [...mods].reverse()) {
    await sendKey(tabId, {
      type: 'keyUp', modifiers: 0,
      key: mod.key, code: mod.code,
      windowsVirtualKeyCode: mod.keyCode, nativeVirtualKeyCode: mod.keyCode,
      autoRepeat: false, isKeypad: false, isSystemKey: false, location: 1
    });
  }
}

async function fireKeyAll(tabIds, ev, holdMs = 0) {
  await Promise.all(tabIds.map(tabId => fireKey(tabId, ev, holdMs)));
}

async function injectSource(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await chrome.tabs.sendMessage(tabId, { type: 'START_LISTEN' });
  } catch (e) {}
}

async function stopSource(tabId) {
  try { await chrome.tabs.sendMessage(tabId, { type: 'STOP_LISTEN' }); } catch (e) {}
}

function shouldMirror(ev) {
  if (mirrorConfig.mode === 'all') return true;
  return mirrorConfig.keys.some(k =>
    k.code === ev.code &&
    !!k.ctrlKey  === !!ev.ctrlKey &&
    !!k.shiftKey === !!ev.shiftKey &&
    !!k.altKey   === !!ev.altKey
  );
}

function autoKeyId(k) {
  return `${k.code}_${+!!k.ctrlKey}${+!!k.shiftKey}${+!!k.altKey}`;
}

function startAutoKeys() {
  stopAutoKeys();
  for (const k of autoConfig.autoKeys) {
    const id = autoKeyId(k);
    autoIntervals[id] = setInterval(() => {
      fireKeyAll(autoConfig.targetTabIds, k, k.holdMs || 0);
    }, k.intervalMs);
  }
}

function stopAutoKeys() {
  Object.values(autoIntervals).forEach(clearInterval);
  autoIntervals = {};
}

async function enableMirror() {
  await ensureDebuggers(mirrorConfig.targetTabIds);
  await injectSource(mirrorConfig.sourceTabId);
}

async function disableMirror() {
  if (mirrorConfig.sourceTabId) await stopSource(mirrorConfig.sourceTabId);
  await releaseDebuggers(mirrorConfig.targetTabIds);
}

async function enableAuto() {
  await ensureDebuggers(autoConfig.targetTabIds);
  startAutoKeys();
}

async function disableAuto() {
  stopAutoKeys();
  await releaseDebuggers(autoConfig.targetTabIds);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'GET_CONFIG') {
    sendResponse({ mirrorConfig, autoConfig });
    return true;
  }

  if (msg.type === 'SET_MIRROR_CONFIG') {
    mirrorConfig = { ...mirrorConfig, ...msg.config };
    (async () => {
      if (mirrorConfig.enabled) await enableMirror();
      else await disableMirror();
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === 'SET_AUTO_CONFIG') {
    autoConfig = { ...autoConfig, ...msg.config };
    (async () => {
      if (autoConfig.enabled) await enableAuto();
      else await disableAuto();
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.type === 'UPDATE_AUTO_KEYS') {
    autoConfig.autoKeys = msg.autoKeys;
    if (autoConfig.enabled) startAutoKeys();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'KEY_EVENT') {
    if (!mirrorConfig.enabled) return;
    if (sender.tab?.id !== mirrorConfig.sourceTabId) return;
    if (!shouldMirror(msg.event)) return;

    const ev = msg.event;
    const tabIds = mirrorConfig.targetTabIds;

    if (ev.type === 'keydown') {
      tabIds.forEach(async tabId => {
        if (!debuggerSessions[tabId]) return;
        const mods = [];
        if (ev.ctrlKey)  mods.push(MODIFIER_KEYS.ctrl);
        if (ev.altKey)   mods.push(MODIFIER_KEYS.alt);
        if (ev.shiftKey) mods.push(MODIFIER_KEYS.shift);
        const modBits = buildModifiers(ev);
        for (const mod of mods) {
          await sendKey(tabId, { type: 'keyDown', modifiers: modBits, key: mod.key, code: mod.code, windowsVirtualKeyCode: mod.keyCode, nativeVirtualKeyCode: mod.keyCode, autoRepeat: false, isKeypad: false, isSystemKey: false, location: 1 });
        }
        await sendKey(tabId, buildEvent(ev, 'keyDown'));
        await sendKey(tabId, buildEvent(ev, 'rawKeyDown'));
        if (!ev.ctrlKey && !ev.altKey && ev.key.length === 1) {
          await sendKey(tabId, { ...buildEvent(ev, 'char'), type: 'char', text: ev.key, unmodifiedText: ev.key.toLowerCase() });
        }
      });
    }

    if (ev.type === 'keyup') {
      tabIds.forEach(async tabId => {
        if (!debuggerSessions[tabId]) return;
        const mods = [];
        if (ev.ctrlKey)  mods.push(MODIFIER_KEYS.ctrl);
        if (ev.altKey)   mods.push(MODIFIER_KEYS.alt);
        if (ev.shiftKey) mods.push(MODIFIER_KEYS.shift);
        await sendKey(tabId, buildEvent(ev, 'keyUp'));
        for (const mod of [...mods].reverse()) {
          await sendKey(tabId, { type: 'keyUp', modifiers: 0, key: mod.key, code: mod.code, windowsVirtualKeyCode: mod.keyCode, nativeVirtualKeyCode: mod.keyCode, autoRepeat: false, isKeypad: false, isSystemKey: false, location: 1 });
        }
      });
    }
  }

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (mirrorConfig.targetTabIds.includes(tabId) || tabId === mirrorConfig.sourceTabId) {
    mirrorConfig.enabled = false;
    delete debuggerSessions[tabId];
  }
  if (autoConfig.targetTabIds.includes(tabId)) {
    autoConfig.enabled = false;
    stopAutoKeys();
    delete debuggerSessions[tabId];
  }
});

chrome.debugger.onDetach.addListener((source) => {
  delete debuggerSessions[source.tabId];
  if (mirrorConfig.targetTabIds.includes(source.tabId)) mirrorConfig.enabled = false;
  if (autoConfig.targetTabIds.includes(source.tabId)) { autoConfig.enabled = false; stopAutoKeys(); }
});
