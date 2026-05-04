/* ═══════════════════════════════════════════════════════════
   KANBAN — DevPad
   Drag & drop task board: To Do / Doing / Done
   ═══════════════════════════════════════════════════════════ */

const Kanban = (() => {
  let data = { todo: [], doing: [], done: [] };
  let draggedCard = null;
  let draggedId = null;
  let draggedFromColumn = null;
  let editingTaskId = null;

  async function init() {
    data = await Storage.getKanban();
    render();
    setupDragAndDrop();
    setupModal();
    document.getElementById('btn-add-task')?.addEventListener('click', () => openModal());
  }

  // ─── Render ──────────────────────────────────────────
  function render() {
    ['todo', 'doing', 'done'].forEach(col => {
      const container = document.getElementById(`cards-${col}`);
      const counter = document.getElementById(`count-${col}`);

      container.innerHTML = '';
      counter.textContent = data[col].length;

      data[col].forEach(task => {
        container.appendChild(createCard(task, col));
      });
    });
  }

  function createCard(task, column) {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.id = task.id;
    card.dataset.column = column;

    card.innerHTML = `
      <div class="kanban-card-priority ${task.priority || 'medium'}"></div>
      <div class="kanban-card-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="kanban-card-desc">${escapeHtml(task.description)}</div>` : ''}
      <div class="kanban-card-actions">
        <button class="kanban-card-btn edit" title="Editar" onclick="Kanban.editTask('${task.id}', '${column}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="kanban-card-btn delete" title="Excluir" onclick="Kanban.deleteTask('${task.id}', '${column}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    // Drag events
    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      draggedId = task.id;
      draggedFromColumn = column;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedCard = null;
    });

    return card;
  }

  // ─── Drag & Drop ─────────────────────────────────────
  function setupDragAndDrop() {
    document.querySelectorAll('.kanban-cards').forEach(container => {
      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        container.closest('.kanban-column').classList.add('drag-over');
      });

      container.addEventListener('dragleave', (e) => {
        // Only remove if actually leaving the column
        if (!container.contains(e.relatedTarget)) {
          container.closest('.kanban-column').classList.remove('drag-over');
        }
      });

      container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.closest('.kanban-column').classList.remove('drag-over');

        const toColumn = container.closest('.kanban-column').dataset.column;
        if (!draggedId || !draggedFromColumn) return;

        moveTask(draggedId, draggedFromColumn, toColumn);
      });
    });
  }

  function moveTask(id, fromCol, toCol) {
    const idx = data[fromCol].findIndex(t => t.id === id);
    if (idx === -1) return;

    const [task] = data[fromCol].splice(idx, 1);
    data[toCol].push(task);

    Storage.saveKanban(data);
    render();
  }

  // ─── Modal ───────────────────────────────────────────
  function setupModal() {
    const overlay = document.getElementById('task-modal-overlay');
    const btnClose = document.getElementById('task-modal-close');
    const btnCancel = document.getElementById('task-modal-cancel');
    const btnSave = document.getElementById('task-modal-save');
    const btnDelete = document.getElementById('task-modal-delete');

    const closeModal = () => {
      overlay.classList.remove('active');
      editingTaskId = null;
    };

    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Priority buttons
    document.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    btnSave?.addEventListener('click', () => {
      const title = document.getElementById('task-title-input').value.trim();
      if (!title) {
        document.getElementById('task-title-input').style.borderColor = 'var(--danger)';
        return;
      }

      const desc = document.getElementById('task-desc-input').value.trim();
      const priority = document.querySelector('.priority-btn.active')?.dataset.priority || 'medium';

      if (editingTaskId) {
        // Find and update task
        for (const col of ['todo', 'doing', 'done']) {
          const task = data[col].find(t => t.id === editingTaskId);
          if (task) {
            task.title = title;
            task.description = desc;
            task.priority = priority;
            break;
          }
        }
      } else {
        const task = {
          id: Storage.generateId(),
          title,
          description: desc,
          priority,
          createdAt: new Date().toISOString()
        };
        data.todo.push(task);
      }

      Storage.saveKanban(data);
      render();
      closeModal();
      showToast('✅', editingTaskId ? 'Tarefa atualizada' : 'Tarefa criada');
    });

    btnDelete?.addEventListener('click', () => {
      if (editingTaskId) {
        for (const col of ['todo', 'doing', 'done']) {
          const idx = data[col].findIndex(t => t.id === editingTaskId);
          if (idx !== -1) {
            data[col].splice(idx, 1);
            break;
          }
        }
        Storage.saveKanban(data);
        render();
        closeModal();
        showToast('🗑️', 'Tarefa excluída');
      }
    });

    // Enter to save
    document.getElementById('task-title-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnSave?.click();
    });

    document.getElementById('task-title-input')?.addEventListener('input', (e) => {
      e.target.style.borderColor = '';
    });
  }

  function openModal(taskId, column) {
    const overlay = document.getElementById('task-modal-overlay');
    const titleInput = document.getElementById('task-title-input');
    const descInput = document.getElementById('task-desc-input');
    const deleteBtn = document.getElementById('task-modal-delete');
    const modalTitle = document.getElementById('task-modal-title');

    if (taskId && column) {
      // Editing
      editingTaskId = taskId;
      const task = data[column].find(t => t.id === taskId);
      if (!task) return;

      modalTitle.textContent = 'Editar Tarefa';
      titleInput.value = task.title;
      descInput.value = task.description || '';
      deleteBtn.classList.remove('hidden');

      // Set priority
      document.querySelectorAll('.priority-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.priority === (task.priority || 'medium'));
      });
    } else {
      // New task
      editingTaskId = null;
      modalTitle.textContent = 'Nova Tarefa';
      titleInput.value = '';
      descInput.value = '';
      deleteBtn.classList.add('hidden');
      document.querySelectorAll('.priority-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.priority === 'medium');
      });
    }

    overlay.classList.add('active');
    setTimeout(() => titleInput.focus(), 100);
  }

  function editTask(id, column) {
    openModal(id, column);
  }

  function deleteTask(id, column) {
    const idx = data[column].findIndex(t => t.id === id);
    if (idx !== -1) {
      data[column].splice(idx, 1);
      Storage.saveKanban(data);
      render();
      showToast('🗑️', 'Tarefa excluída');
    }
  }

  // ─── Utils ───────────────────────────────────────────
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return { init, editTask, deleteTask };
})();
