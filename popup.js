
const KEY_OPTIONS = [
  { label: '1', code: 'Digit1', key: '1', keyCode: 49 },
  { label: '2', code: 'Digit2', key: '2', keyCode: 50 },
  { label: '3', code: 'Digit3', key: '3', keyCode: 51 },
  { label: '4', code: 'Digit4', key: '4', keyCode: 52 },
  { label: '5', code: 'Digit5', key: '5', keyCode: 53 },
  { label: '6', code: 'Digit6', key: '6', keyCode: 54 },
  { label: '7', code: 'Digit7', key: '7', keyCode: 55 },
  { label: '8', code: 'Digit8', key: '8', keyCode: 56 },
  { label: '9', code: 'Digit9', key: '9', keyCode: 57 },
  { label: '0', code: 'Digit0', key: '0', keyCode: 48 },
  { label: 'F1',  code: 'F1',  key: 'F1',  keyCode: 112 },
  { label: 'F2',  code: 'F2',  key: 'F2',  keyCode: 113 },
  { label: 'F3',  code: 'F3',  key: 'F3',  keyCode: 114 },
  { label: 'F4',  code: 'F4',  key: 'F4',  keyCode: 115 },
  { label: 'F5',  code: 'F5',  key: 'F5',  keyCode: 116 },
  { label: 'F6',  code: 'F6',  key: 'F6',  keyCode: 117 },
  { label: 'F7',  code: 'F7',  key: 'F7',  keyCode: 118 },
  { label: 'F8',  code: 'F8',  key: 'F8',  keyCode: 119 },
  { label: 'F9',  code: 'F9',  key: 'F9',  keyCode: 120 },
  { label: 'F10', code: 'F10', key: 'F10', keyCode: 121 },
  { label: 'F11', code: 'F11', key: 'F11', keyCode: 122 },
  { label: 'F12', code: 'F12', key: 'F12', keyCode: 123 },
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => ({
    label: l, code: `Key${l}`, key: l.toLowerCase(), keyCode: l.charCodeAt(0)
  })),
  { label: 'Space',  code: 'Space',     key: ' ',      keyCode: 32  },
  { label: 'Enter',  code: 'Enter',     key: 'Enter',  keyCode: 13  },
  { label: 'Tab',    code: 'Tab',       key: 'Tab',    keyCode: 9   },
  { label: 'Escape', code: 'Escape',    key: 'Escape', keyCode: 27  },
  { label: '`',      code: 'Backquote', key: '`',      keyCode: 192 },
  { label: '-',      code: 'Minus',     key: '-',      keyCode: 189 },
  { label: '=',      code: 'Equal',     key: '=',      keyCode: 187 },
];

function populateKeySelect(sel) {
  sel.innerHTML = '';
  KEY_OPTIONS.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k.code;
    opt.textContent = k.label;
    sel.appendChild(opt);
  });
}

function getKeyByCode(code) { return KEY_OPTIONS.find(k => k.code === code); }
function modToFlags(mod) {
  return { ctrlKey: mod.includes('ctrl'), altKey: mod.includes('alt'), shiftKey: mod.includes('shift') };
}
function buildKeyEntry(code, mod) {
  const base = getKeyByCode(code);
  if (!base) return null;
  return { ...base, ...modToFlags(mod) };
}
function keyLabel(k) {
  const parts = [];
  if (k.ctrlKey)  parts.push('Ctrl');
  if (k.shiftKey) parts.push('Shift');
  if (k.altKey)   parts.push('Alt');
  parts.push(k.label || (k.key === ' ' ? 'Space' : k.key));
  return parts.join('+');
}
function keyId(k) { return `${k.code}_${+!!k.ctrlKey}${+!!k.shiftKey}${+!!k.altKey}`; }

function getSelectedIds(sel) {
  return Array.from(sel.selectedOptions).map(o => parseInt(o.value));
}


let mirrorMode = 'all';
let mirrorKeys = [];
let mirrorOn   = false;
let savedMirrorSourceId  = null;
let savedMirrorTargetIds = [];

let autoKeys = [];
let autoOn   = false;
let savedAutoTargetIds = [];


const mirrorSource   = document.getElementById('mirrorSource');
const mirrorTarget   = document.getElementById('mirrorTarget');
const mirrorToggle   = document.getElementById('mirrorToggle');
const mirrorDot      = document.getElementById('mirrorDot');
const mirrorStatus   = document.getElementById('mirrorStatus');
const mirrorChips    = document.getElementById('mirrorChips');
const mirrorSpecific = document.getElementById('mirrorSpecificSection');
const mirrorModSel   = document.getElementById('mirrorMod');
const mirrorKeySel   = document.getElementById('mirrorKey');
const btnAddMirror   = document.getElementById('btnAddMirrorKey');

const autoTarget  = document.getElementById('autoTarget');
const autoToggle  = document.getElementById('autoToggle');
const autoDot     = document.getElementById('autoDot');
const autoStatus  = document.getElementById('autoStatus');
const autoList    = document.getElementById('autoList');
const autoModSel  = document.getElementById('autoMod');
const autoKeySel  = document.getElementById('autoKey');
const autoMsInput = document.getElementById('autoMs');
const autoHoldMs  = document.getElementById('autoHoldMs');
const btnAddAuto  = document.getElementById('btnAddAuto');

populateKeySelect(mirrorKeySel);
populateKeySelect(autoKeySel);


function saveToStorage() {
  chrome.storage.local.set({
    mirrorMode, mirrorKeys, mirrorOn,
    mirrorSourceId:  parseInt(mirrorSource.value) || null,
    mirrorTargetIds: getSelectedIds(mirrorTarget),
    autoKeys, autoOn,
    autoTargetIds: getSelectedIds(autoTarget),
    mirrorModSel: mirrorModSel.value,
    mirrorKeySel: mirrorKeySel.value,
    autoModSel: autoModSel.value,
    autoKeySel: autoKeySel.value,
  });
}


async function loadTabs() {
  const tabs = await chrome.tabs.query({});
  const sorted = [...tabs.filter(t => t.active), ...tabs.filter(t => !t.active)];
  const tabIds = sorted.map(t => String(t.id));

  // Populate single select (source)
  mirrorSource.innerHTML = '';
  sorted.forEach(tab => {
    const opt = document.createElement('option');
    opt.value = tab.id;
    opt.textContent = ((tab.active ? '★ ' : '') + (tab.title || 'Tab ' + tab.id)).slice(0, 38);
    mirrorSource.appendChild(opt);
  });

  // Populate multi-selects (mirror target, auto target)
  [mirrorTarget, autoTarget].forEach(sel => {
    sel.innerHTML = '';
    sorted.forEach(tab => {
      const opt = document.createElement('option');
      opt.value = tab.id;
      opt.textContent = ((tab.active ? '★ ' : '') + (tab.title || 'Tab ' + tab.id)).slice(0, 38);
      sel.appendChild(opt);
    });
  });

  // Restore saved selections
  if (savedMirrorSourceId && tabIds.includes(String(savedMirrorSourceId))) {
    mirrorSource.value = savedMirrorSourceId;
  }

  // Restore multi-select saved values
  restoreMultiSelect(mirrorTarget, savedMirrorTargetIds, tabIds);
  restoreMultiSelect(autoTarget,   savedAutoTargetIds,   tabIds);

  // Default: if nothing saved, select 2nd tab for targets
  if (getSelectedIds(mirrorTarget).length === 0 && sorted.length >= 2) {
    mirrorTarget.options[1].selected = true;
  }
  if (getSelectedIds(autoTarget).length === 0 && sorted.length >= 2) {
    autoTarget.options[1].selected = true;
  }
}

function restoreMultiSelect(sel, savedIds, tabIds) {
  if (!savedIds || savedIds.length === 0) return;
  Array.from(sel.options).forEach(opt => {
    opt.selected = savedIds.includes(parseInt(opt.value)) && tabIds.includes(opt.value);
  });
}

document.getElementById('refreshBtn').addEventListener('click', loadTabs);
mirrorSource.addEventListener('change', saveToStorage);
mirrorTarget.addEventListener('change', saveToStorage);
autoTarget.addEventListener('change', saveToStorage);


document.querySelectorAll('.mode-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mirrorMode = btn.dataset.mode;
    mirrorSpecific.style.display = mirrorMode === 'selected' ? 'flex' : 'none';
    saveToStorage();
  });
});


btnAddMirror.addEventListener('click', () => {
  const entry = buildKeyEntry(mirrorKeySel.value, mirrorModSel.value);
  if (!entry) return;
  if (!mirrorKeys.find(k => keyId(k) === keyId(entry))) {
    mirrorKeys.push(entry);
    renderMirrorChips();
    saveToStorage();
  }
});

function renderMirrorChips() {
  if (mirrorKeys.length === 0) {
    mirrorChips.innerHTML = '<span class="empty-note">No keys added</span>';
    return;
  }
  mirrorChips.innerHTML = '';
  mirrorKeys.forEach(k => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span>${keyLabel(k)}</span><button class="chip-x" data-id="${keyId(k)}">×</button>`;
    chip.querySelector('.chip-x').addEventListener('click', () => {
      mirrorKeys = mirrorKeys.filter(x => keyId(x) !== keyId(k));
      renderMirrorChips();
      saveToStorage();
    });
    mirrorChips.appendChild(chip);
  });
}


mirrorToggle.addEventListener('click', () => {
  const sourceTabId  = parseInt(mirrorSource.value);
  const targetTabIds = getSelectedIds(mirrorTarget);
  if (!sourceTabId || targetTabIds.length === 0) return;
  if (targetTabIds.includes(sourceTabId)) { mirrorStatus.textContent = 'Source must not be a target!'; return; }
  if (mirrorMode === 'selected' && mirrorKeys.length === 0) { mirrorStatus.textContent = 'Add a key first'; return; }

  mirrorOn = !mirrorOn;
  chrome.runtime.sendMessage({
    type: 'SET_MIRROR_CONFIG',
    config: { sourceTabId, targetTabIds, keys: mirrorKeys, mode: mirrorMode, enabled: mirrorOn }
  }, () => { setMirrorUI(mirrorOn); saveToStorage(); });
});

function setMirrorUI(on) {
  mirrorOn = on;
  mirrorToggle.textContent = on ? '■ Stop Mirror' : '▶ Start Mirror';
  mirrorToggle.className   = `toggle-btn ${on ? 'on' : 'off'}`;
  mirrorDot.className      = `dot ${on ? 'on' : ''}`;
  mirrorStatus.className   = `pill-text ${on ? 'on' : ''}`;
  mirrorStatus.textContent = on
    ? (mirrorMode === 'all' ? 'All keys active' : mirrorKeys.map(keyLabel).join(', '))
    : 'Inactive';
}


btnAddAuto.addEventListener('click', () => {
  const entry = buildKeyEntry(autoKeySel.value, autoModSel.value);
  if (!entry) return;
  const ms   = Math.max(50, parseInt(autoMsInput.value) || 500);
  const hold = Math.max(0,  parseInt(autoHoldMs.value)  || 0);
  const item = { ...entry, intervalMs: ms, holdMs: hold };
  if (!autoKeys.find(k => keyId(k) === keyId(item))) {
    autoKeys.push(item);
    renderAutoList();
    if (autoOn) pushAutoKeys();
    saveToStorage();
  }
});

function renderAutoList() {
  if (autoKeys.length === 0) {
    autoList.innerHTML = '<span class="empty-note">No auto-repeat keys</span>';
    return;
  }
  autoList.innerHTML = '';
  autoKeys.forEach(k => {
    const holdLabel = k.holdMs > 0 ? ` hold:${k.holdMs}ms` : '';
    const item = document.createElement('div');
    item.className = 'auto-item';
    item.innerHTML = `
      <span class="auto-key-label">${keyLabel(k)}</span>
      <span class="auto-detail">every ${k.intervalMs}ms${holdLabel}</span>
      <button class="auto-x" data-id="${keyId(k)}">×</button>
    `;
    item.querySelector('.auto-x').addEventListener('click', () => {
      autoKeys = autoKeys.filter(x => keyId(x) !== keyId(k));
      renderAutoList();
      if (autoOn) pushAutoKeys();
      saveToStorage();
    });
    autoList.appendChild(item);
  });
}

function pushAutoKeys() {
  chrome.runtime.sendMessage({ type: 'UPDATE_AUTO_KEYS', autoKeys });
}


autoToggle.addEventListener('click', () => {
  const targetTabIds = getSelectedIds(autoTarget);
  if (targetTabIds.length === 0) return;
  if (autoKeys.length === 0) { autoStatus.textContent = 'Add a key first'; return; }

  autoOn = !autoOn;
  chrome.runtime.sendMessage({
    type: 'SET_AUTO_CONFIG',
    config: { targetTabIds, autoKeys, enabled: autoOn }
  }, () => { setAutoUI(autoOn); saveToStorage(); });
});

function setAutoUI(on) {
  autoOn = on;
  autoToggle.textContent = on ? '■ Stop Auto' : '▶ Start Auto';
  autoToggle.className   = `toggle-btn ${on ? 'on' : 'off'}`;
  autoDot.className      = `dot ${on ? 'on' : ''}`;
  autoStatus.className   = `pill-text ${on ? 'on' : ''}`;
  autoStatus.textContent = on ? `${autoKeys.length} key(s) firing` : 'Inactive';
}


chrome.storage.local.get([
  'mirrorMode', 'mirrorKeys', 'mirrorOn',
  'mirrorSourceId', 'mirrorTargetIds',
  'autoKeys', 'autoOn', 'autoTargetIds',
  'mirrorModSel', 'mirrorKeySel',
  'autoModSel', 'autoKeySel',
], (saved) => {
  mirrorMode = saved.mirrorMode || 'all';
  mirrorKeys = saved.mirrorKeys || [];
  mirrorOn   = saved.mirrorOn   || false;
  savedMirrorSourceId  = saved.mirrorSourceId  || null;
  savedMirrorTargetIds = saved.mirrorTargetIds || [];

  autoKeys = saved.autoKeys || [];
  autoOn   = saved.autoOn   || false;
  savedAutoTargetIds = saved.autoTargetIds || [];

  if (saved.mirrorModSel) mirrorModSel.value = saved.mirrorModSel;
  if (saved.mirrorKeySel) mirrorKeySel.value = saved.mirrorKeySel;
  if (saved.autoModSel)   autoModSel.value   = saved.autoModSel;
  if (saved.autoKeySel)   autoKeySel.value   = saved.autoKeySel;

  document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mirrorMode));
  mirrorSpecific.style.display = mirrorMode === 'selected' ? 'flex' : 'none';

  renderMirrorChips();
  renderAutoList();

  chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (resp) => {
    if (resp?.mirrorConfig) setMirrorUI(resp.mirrorConfig.enabled);
    if (resp?.autoConfig)   setAutoUI(resp.autoConfig.enabled);
  });

  loadTabs();
});
