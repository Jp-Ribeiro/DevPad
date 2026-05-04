/* ═══════════════════════════════════════════════════════════
   APP — DevPad
   Main application controller
   ═══════════════════════════════════════════════════════════ */

// ─── Toast System ────────────────────────────────────────
function showToast(icon, message, duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
  `;
  toast.style.position = 'relative';
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── App Namespace (for Shortcuts to call) ───────────────
const App = {
  switchTab: null,
  toggleSettings: null
};

// ─── App Init ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // ─── Window Controls ───────────────────────────────
  document.getElementById('btn-minimize')?.addEventListener('click', () => window.devpad.minimize());
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.devpad.maximize());
  document.getElementById('btn-close')?.addEventListener('click', () => {
    Editor.saveCurrentNote();
    window.devpad.close();
  });

  // ─── Tab Navigation ────────────────────────────────
  const tabs = document.querySelectorAll('.sidebar-tab[data-tab]');
  const views = document.querySelectorAll('.view');

  function switchTab(tabName) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    views.forEach(v => v.classList.toggle('active', v.id === `view-${tabName}`));
    Storage.setActiveTab(tabName);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // ─── Settings Panel ────────────────────────────────
  const settingsBtn = document.getElementById('tab-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');

  function toggleSettings(show) {
    if (show === undefined) {
      show = !settingsPanel.classList.contains('active');
    }
    settingsPanel.classList.toggle('active', show);
    settingsOverlay.classList.toggle('active', show);
  }

  settingsBtn?.addEventListener('click', () => toggleSettings(true));
  settingsClose?.addEventListener('click', () => toggleSettings(false));
  settingsOverlay?.addEventListener('click', () => toggleSettings(false));

  // Expose for Shortcuts module
  App.switchTab = switchTab;
  App.toggleSettings = toggleSettings;

  // ─── Init Modules ──────────────────────────────────
  await Settings.init();
  await Editor.init();
  ImageEditor.init();
  await Kanban.init();
  await Reminders.init();
  await Shortcuts.init();

  // ─── Restore Active Tab ────────────────────────────
  const activeTab = await Storage.getActiveTab();
  switchTab(activeTab || 'editor');

  // ─── Double-click on note tabs bar → new note ──────
  document.getElementById('note-tabs-bar')?.addEventListener('dblclick', (e) => {
    if (e.target.closest('.note-tab') || e.target.closest('.note-tab-add')) return;
    Editor.addNote();
  });

  // ─── Auto-save on window blur ──────────────────────
  window.addEventListener('blur', () => {
    Editor.saveCurrentNote();
  });

  console.log('⚡ DevPad initialized');
});
