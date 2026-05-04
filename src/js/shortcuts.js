/* ═══════════════════════════════════════════════════════════
   SHORTCUTS — DevPad
   Configurable keyboard shortcuts with UI panel
   ═══════════════════════════════════════════════════════════ */

const Shortcuts = (() => {
  // Default shortcuts
  const DEFAULTS = {
    'new-note':       { key: 'n',     ctrl: true, shift: false, label: 'Nova nota',           action: () => Editor.addNote() },
    'save-note':      { key: 's',     ctrl: true, shift: false, label: 'Salvar nota',         action: () => { Editor.saveCurrentNote(); showToast('💾', 'Nota salva!'); } },
    'export-note':    { key: 'e',     ctrl: true, shift: true,  label: 'Exportar nota',       action: () => Editor.exportCurrentNote() },
    'search':         { key: 'f',     ctrl: true, shift: false, label: 'Buscar nas notas',    action: () => Editor._openSearch?.() },
    'focus-mode':     { key: 'f',     ctrl: true, shift: true,  label: 'Modo Foco',           action: () => Editor.toggleFocusMode() },
    'import-file':    { key: 'o',     ctrl: true, shift: false, label: 'Importar arquivo',    action: () => Editor.importFiles() },
    'tab-editor':     { key: '1',     ctrl: true, shift: false, label: 'Ir para Editor',      action: () => App.switchTab('editor') },
    'tab-kanban':     { key: '2',     ctrl: true, shift: false, label: 'Ir para Kanban',      action: () => App.switchTab('kanban') },
    'tab-reminders':  { key: '3',     ctrl: true, shift: false, label: 'Ir para Lembretes',   action: () => App.switchTab('reminders') },
    'open-settings':  { key: ',',     ctrl: true, shift: false, label: 'Abrir configurações', action: () => App.toggleSettings() },
    'add-code-block': { key: 'k',     ctrl: true, shift: true,  label: 'Inserir código',      action: () => document.getElementById('btn-add-code')?.click() },
    'bold':           { key: 'b',     ctrl: true, shift: false, label: 'Negrito',             action: () => document.execCommand('bold') },
    'italic':         { key: 'i',     ctrl: true, shift: false, label: 'Itálico',             action: () => document.execCommand('italic') },
    'underline':      { key: 'u',     ctrl: true, shift: false, label: 'Sublinhado',          action: () => document.execCommand('underline') },
  };

  let shortcuts = {};
  let isRecording = false;
  let recordingId = null;

  async function init() {
    const saved = await Storage.get('shortcuts');
    shortcuts = {};

    // Merge saved with defaults
    for (const [id, def] of Object.entries(DEFAULTS)) {
      if (saved && saved[id]) {
        shortcuts[id] = { ...def, key: saved[id].key, ctrl: saved[id].ctrl, shift: saved[id].shift };
      } else {
        shortcuts[id] = { ...def };
      }
    }

    setupGlobalListener();
    renderShortcutsPanel();

    // Open shortcuts button in settings
    document.getElementById('btn-open-shortcuts')?.addEventListener('click', () => {
      document.getElementById('shortcuts-modal-overlay')?.classList.add('active');
    });
  }

  // ─── Global Keyboard Listener ────────────────────────
  function setupGlobalListener() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts while recording a new one
      if (isRecording) return;

      // Don't trigger shortcuts while typing in inputs
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const isEditor = e.target.id === 'editor-content' || e.target.closest('#editor-content');

      for (const [id, shortcut] of Object.entries(shortcuts)) {
        const ctrlMatch = shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift === e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && keyMatch) {
          // Allow bold/italic/underline in the editor
          const isFormatting = ['bold', 'italic', 'underline'].includes(id);
          if (isInput && !isFormatting) continue;

          e.preventDefault();
          shortcut.action();
          return;
        }
      }

      // Escape closes modals / focus mode
      if (e.key === 'Escape') {
        if (document.body.classList.contains('focus-mode')) {
          Editor.toggleFocusMode();
          return;
        }
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        App.toggleSettings(false);
        Editor._closeSearch?.();
      }
    });
  }

  // ─── Shortcuts Panel ─────────────────────────────────
  function renderShortcutsPanel() {
    const list = document.getElementById('shortcuts-list');
    if (!list) return;

    list.innerHTML = '';

    for (const [id, shortcut] of Object.entries(shortcuts)) {
      const row = document.createElement('div');
      row.className = 'shortcut-row';
      row.dataset.id = id;

      row.innerHTML = `
        <span class="shortcut-label">${shortcut.label}</span>
        <button class="shortcut-key-btn" data-id="${id}" title="Clique para alterar">
          ${formatShortcut(shortcut)}
        </button>
      `;

      list.appendChild(row);
    }

    // Click to record new shortcut
    list.querySelectorAll('.shortcut-key-btn').forEach(btn => {
      btn.addEventListener('click', () => startRecording(btn.dataset.id, btn));
    });

    // Close / Reset buttons
    document.getElementById('shortcuts-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('shortcuts-modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'shortcuts-modal-overlay') closeModal();
    });
    document.getElementById('shortcuts-reset')?.addEventListener('click', resetAll);
  }

  function formatShortcut(shortcut) {
    const parts = [];
    if (shortcut.ctrl) parts.push('<span class="key-badge">Ctrl</span>');
    if (shortcut.shift) parts.push('<span class="key-badge">Shift</span>');
    parts.push(`<span class="key-badge key-main">${shortcut.key.toUpperCase()}</span>`);
    return parts.join(' + ');
  }

  function startRecording(id, btn) {
    isRecording = true;
    recordingId = id;

    btn.innerHTML = '<span class="shortcut-recording">Pressione a tecla...</span>';
    btn.classList.add('recording');

    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier-only presses
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const newShortcut = {
        key: e.key.length === 1 ? e.key.toLowerCase() : e.key,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey
      };

      // Update
      shortcuts[id] = { ...shortcuts[id], ...newShortcut };
      btn.innerHTML = formatShortcut(shortcuts[id]);
      btn.classList.remove('recording');

      // Save
      const toSave = {};
      for (const [sid, s] of Object.entries(shortcuts)) {
        toSave[sid] = { key: s.key, ctrl: s.ctrl, shift: s.shift };
      }
      Storage.set('shortcuts', toSave);

      isRecording = false;
      recordingId = null;
      document.removeEventListener('keydown', handler, true);

      showToast('⌨️', `Atalho "${shortcuts[id].label}" atualizado`);
    };

    document.addEventListener('keydown', handler, true);

    // Cancel on click elsewhere
    setTimeout(() => {
      const cancelHandler = (e) => {
        if (e.target === btn || btn.contains(e.target)) return;
        isRecording = false;
        recordingId = null;
        btn.innerHTML = formatShortcut(shortcuts[id]);
        btn.classList.remove('recording');
        document.removeEventListener('keydown', handler, true);
        document.removeEventListener('click', cancelHandler);
      };
      document.addEventListener('click', cancelHandler);
    }, 100);
  }

  function resetAll() {
    for (const [id, def] of Object.entries(DEFAULTS)) {
      shortcuts[id] = { ...def };
    }
    Storage.set('shortcuts', null);
    renderShortcutsPanel();
    showToast('🔄', 'Atalhos restaurados');
  }

  function closeModal() {
    document.getElementById('shortcuts-modal-overlay')?.classList.remove('active');
  }

  return { init };
})();
