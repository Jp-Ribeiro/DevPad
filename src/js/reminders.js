/* ═══════════════════════════════════════════════════════════
   REMINDERS — DevPad
   Reminder creation, scheduling, and OS notifications
   ═══════════════════════════════════════════════════════════ */

const Reminders = (() => {
  let reminders = [];

  async function init() {
    reminders = await Storage.getReminders();
    render();
    setupModal();
    setupListeners();

    document.getElementById('btn-add-reminder')?.addEventListener('click', () => openModal());

    // Check for triggered reminders periodically
    setInterval(checkReminders, 30000);
  }

  // ─── Render ──────────────────────────────────────────
  function render() {
    const list = document.getElementById('reminders-list');
    const empty = document.getElementById('reminders-empty');

    // Sort: upcoming first, then completed
    const sorted = [...reminders].sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      return new Date(a.datetime) - new Date(b.datetime);
    });

    // Remove all except empty state
    Array.from(list.children).forEach(child => {
      if (child.id !== 'reminders-empty') child.remove();
    });

    if (sorted.length === 0) {
      empty.style.display = 'flex';
      return;
    }

    empty.style.display = 'none';

    sorted.forEach(reminder => {
      list.appendChild(createReminderCard(reminder));
    });
  }

  function createReminderCard(reminder) {
    const card = document.createElement('div');
    card.className = `reminder-card ${reminder.completed ? 'completed' : ''}`;
    card.dataset.id = reminder.id;

    const dt = new Date(reminder.datetime);
    const now = new Date();
    const isPast = dt < now && !reminder.completed;

    const repeatLabel = {
      none: '',
      daily: '🔁 Diário',
      weekly: '🔁 Semanal'
    };

    card.innerHTML = `
      <div class="reminder-icon">${isPast ? '🔴' : reminder.completed ? '✅' : '🔔'}</div>
      <div class="reminder-info">
        <div class="reminder-title">${escapeHtml(reminder.title)}</div>
        <div class="reminder-datetime">${formatDateTime(dt)}</div>
        ${reminder.repeat !== 'none' ? `<div class="reminder-repeat">${repeatLabel[reminder.repeat]}</div>` : ''}
      </div>
      <div class="reminder-actions">
        ${!reminder.completed ? `
          <button class="reminder-btn complete" title="Marcar como concluído" onclick="Reminders.complete('${reminder.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        ` : ''}
        <button class="reminder-btn delete" title="Excluir" onclick="Reminders.remove('${reminder.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    return card;
  }

  // ─── Modal ───────────────────────────────────────────
  function setupModal() {
    const overlay = document.getElementById('reminder-modal-overlay');
    const btnClose = document.getElementById('reminder-modal-close');
    const btnCancel = document.getElementById('reminder-modal-cancel');
    const btnSave = document.getElementById('reminder-modal-save');

    const closeModal = () => overlay.classList.remove('active');

    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    btnSave?.addEventListener('click', () => {
      const title = document.getElementById('reminder-title-input').value.trim();
      const datetime = document.getElementById('reminder-datetime-input').value;
      const repeat = document.getElementById('reminder-repeat-select').value;

      if (!title) {
        document.getElementById('reminder-title-input').style.borderColor = 'var(--danger)';
        return;
      }
      if (!datetime) {
        document.getElementById('reminder-datetime-input').style.borderColor = 'var(--danger)';
        return;
      }

      const reminder = {
        id: Storage.generateId(),
        title,
        datetime,
        repeat,
        completed: false,
        createdAt: new Date().toISOString()
      };

      reminders.push(reminder);
      Storage.saveReminders(reminders);
      render();

      // Schedule notification
      window.devpad.scheduleReminder(reminder);

      closeModal();
      showToast('🔔', `Lembrete "${title}" criado!`);
    });

    // Enter to save
    document.getElementById('reminder-title-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnSave?.click();
    });

    // Clear error on input
    document.getElementById('reminder-title-input')?.addEventListener('input', (e) => {
      e.target.style.borderColor = '';
    });
    document.getElementById('reminder-datetime-input')?.addEventListener('input', (e) => {
      e.target.style.borderColor = '';
    });
  }

  function openModal() {
    const overlay = document.getElementById('reminder-modal-overlay');
    document.getElementById('reminder-title-input').value = '';
    document.getElementById('reminder-repeat-select').value = 'none';

    // Default datetime: 1 hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    const localISO = now.toISOString().slice(0, 16);
    document.getElementById('reminder-datetime-input').value = localISO;

    overlay.classList.add('active');
    setTimeout(() => document.getElementById('reminder-title-input').focus(), 100);
  }

  // ─── Actions ─────────────────────────────────────────
  function complete(id) {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    reminder.completed = true;
    window.devpad.cancelReminder(id);

    // If repeating, create next occurrence
    if (reminder.repeat !== 'none') {
      const next = { ...reminder };
      next.id = Storage.generateId();
      next.completed = false;

      const dt = new Date(reminder.datetime);
      if (reminder.repeat === 'daily') dt.setDate(dt.getDate() + 1);
      if (reminder.repeat === 'weekly') dt.setDate(dt.getDate() + 7);
      next.datetime = dt.toISOString().slice(0, 16);

      reminders.push(next);
      window.devpad.scheduleReminder(next);
    }

    Storage.saveReminders(reminders);
    render();
    showToast('✅', 'Lembrete concluído!');
  }

  function remove(id) {
    reminders = reminders.filter(r => r.id !== id);
    window.devpad.cancelReminder(id);
    Storage.saveReminders(reminders);
    render();
    showToast('🗑️', 'Lembrete removido');
  }

  // ─── Listeners ───────────────────────────────────────
  function setupListeners() {
    window.devpad.onReminderTriggered((id) => {
      const reminder = reminders.find(r => r.id === id);
      if (reminder) {
        showToast('🔔', `Lembrete: ${reminder.title}`, 10000);
      }
    });
  }

  // ─── Check Reminders ────────────────────────────────
  function checkReminders() {
    const now = new Date();
    reminders.forEach(r => {
      if (!r.completed && new Date(r.datetime) <= now) {
        // Mark as needing attention
        render();
      }
    });
  }

  // ─── Utils ───────────────────────────────────────────
  function formatDateTime(date) {
    const options = {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('pt-BR', options);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return { init, complete, remove };
})();
