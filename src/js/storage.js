/* ═══════════════════════════════════════════════════════════
   STORAGE — DevPad
   Persistence layer with auto-save and debouncing
   ═══════════════════════════════════════════════════════════ */

const Storage = (() => {
  let saveTimer = null;
  const DEBOUNCE_MS = 1000;

  // ─── Core API ────────────────────────────────────────
  async function get(key) {
    return await window.devpad.getStore(key);
  }

  async function set(key, value) {
    return await window.devpad.setStore(key, value);
  }

  async function getAll() {
    return await window.devpad.getAllStore();
  }

  // ─── Debounced Save ──────────────────────────────────
  function debouncedSave(key, value) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      set(key, value);
    }, DEBOUNCE_MS);
  }

  // ─── Notes ───────────────────────────────────────────
  async function getNotes() {
    return (await get('notes')) || [];
  }

  async function saveNotes(notes) {
    return set('notes', notes);
  }

  async function getActiveNoteId() {
    return await get('activeNoteId');
  }

  async function setActiveNoteId(id) {
    return set('activeNoteId', id);
  }

  // ─── Kanban ──────────────────────────────────────────
  async function getKanban() {
    return (await get('kanban')) || { todo: [], doing: [], done: [] };
  }

  async function saveKanban(kanban) {
    return set('kanban', kanban);
  }

  // ─── Reminders ───────────────────────────────────────
  async function getReminders() {
    return (await get('reminders')) || [];
  }

  async function saveReminders(reminders) {
    return set('reminders', reminders);
  }

  // ─── Settings ────────────────────────────────────────
  async function getSettings() {
    return (await get('settings')) || {
      theme: 'dark',
      opacity: 1.0,
      alwaysOnTop: false
    };
  }

  async function saveSettings(settings) {
    return set('settings', settings);
  }

  // ─── Active Tab ──────────────────────────────────────
  async function getActiveTab() {
    return (await get('activeTab')) || 'editor';
  }

  async function setActiveTab(tab) {
    return set('activeTab', tab);
  }

  // ─── UUID Generator ──────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  return {
    get,
    set,
    getAll,
    debouncedSave,
    getNotes,
    saveNotes,
    getActiveNoteId,
    setActiveNoteId,
    getKanban,
    saveKanban,
    getReminders,
    saveReminders,
    getSettings,
    saveSettings,
    getActiveTab,
    setActiveTab,
    generateId
  };
})();
