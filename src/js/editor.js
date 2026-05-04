/* ═══════════════════════════════════════════════════════════
   EDITOR — DevPad
   Rich text editor with code blocks, image paste, note tabs
   ═══════════════════════════════════════════════════════════ */

const Editor = (() => {
  let notes = [];
  let activeNoteId = null;
  let saveTimer = null;
  let eolMode = 'LF'; // 'LF' or 'CRLF'

  let activePaneId = 'editor-content';
  let isSplitView = false;
  let activeNotes = {
    'editor-content': null,
    'editor-content-2': null
  };

  function getActiveEditor() {
    return document.getElementById(activePaneId);
  }

  function getAllEditors() {
    return [
      document.getElementById('editor-content'),
      document.getElementById('editor-content-2')
    ].filter(Boolean);
  }

  // ─── Syntax highlighting patterns per language ───────
  const SYNTAX = {
    javascript: {
      keywords: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|this|class|extends|import|export|default|from|async|await|try|catch|finally|throw|typeof|instanceof|in|of|void|delete|yield|static|get|set|super)\b/g,
      strings: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*)\b/g,
      functions: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g
    },
    python: {
      keywords: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|is|in|True|False|None|self|print|async|await)\b/g,
      strings: /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
      comments: /(#.*$)/gm,
      numbers: /\b(\d+\.?\d*)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g
    },
    java: {
      keywords: /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|void|int|long|double|float|boolean|char|byte|short|String|null|true|false|this|super|import|package)\b/g,
      strings: /(["'])(?:(?=(\\?))\2.)*?\1/g,
      comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*[fFdDlL]?)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g
    },
    html: {
      keywords: /(&lt;\/?[a-zA-Z][\w-]*|&gt;|\/?&gt;)/g,
      strings: /(["'])(?:(?=(\\?))\2.)*?\1/g,
      comments: /(&lt;!--[\s\S]*?--&gt;)/g,
      numbers: /\b(\d+)\b/g,
      functions: /\b(class|id|style|src|href|alt|type|name|value)\b(?==)/g
    },
    css: {
      keywords: /(@media|@keyframes|@import|@font-face|@supports|!important)\b/g,
      strings: /(["'])(?:(?=(\\?))\2.)*?\1/g,
      comments: /(\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*(px|em|rem|%|vh|vw|s|ms|deg)?)\b/g,
      functions: /\b([a-zA-Z-]+)\s*(?=\()/g
    },
    sql: {
      keywords: /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|EXISTS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|UNION|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|NULL|IS|LIKE|BETWEEN|CASE|WHEN|THEN|ELSE|END)\b/gi,
      strings: /(["'])(?:(?=(\\?))\2.)*?\1/g,
      comments: /(--.*$|\/\*[\s\S]*?\*\/)/gm,
      numbers: /\b(\d+\.?\d*)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g
    },
    bash: {
      keywords: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|echo|exit|export|source|alias|cd|ls|grep|awk|sed|cat|mkdir|rm|cp|mv|chmod|chown|sudo)\b/g,
      strings: /(["'])(?:(?=(\\?))\2.)*?\1/g,
      comments: /(#.*$)/gm,
      numbers: /\b(\d+)\b/g,
      functions: /\b([a-zA-Z_][\w]*)\s*(?=\()/g
    },
    json: {
      keywords: /\b(true|false|null)\b/g,
      strings: /("(?:[^"\\]|\\.)*")\s*(?=:)/g,  // keys
      comments: /$/g, // no comments in JSON
      numbers: /\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
      functions: /("(?:[^"\\]|\\.)*")\s*(?!:)/g  // values that are strings
    }
  };

  // Aliases
  SYNTAX.typescript = SYNTAX.javascript;
  SYNTAX.c = SYNTAX.java;
  SYNTAX.cpp = SYNTAX.java;
  SYNTAX.csharp = SYNTAX.java;
  SYNTAX.go = SYNTAX.java;
  SYNTAX.rust = SYNTAX.java;
  SYNTAX.yaml = SYNTAX.python;
  SYNTAX.markdown = SYNTAX.html;

  // ─── Init ────────────────────────────────────────────
  async function init() {
    notes = await Storage.getNotes();
    activeNoteId = await Storage.getActiveNoteId();

    // Default note if none exist
    if (notes.length === 0) {
      const defaultNote = {
        id: Storage.generateId(),
        title: 'Nota 1',
        content: '<p>Bem-vindo ao <strong>DevPad</strong>! ✨</p><p>Comece a digitar ou use a barra de ferramentas acima.</p>'
      };
      notes.push(defaultNote);
      activeNoteId = defaultNote.id;
      await Storage.saveNotes(notes);
      await Storage.setActiveNoteId(activeNoteId);
    }

    if (!activeNoteId) activeNoteId = notes[0]?.id;
    activeNotes['editor-content'] = activeNoteId;

    renderNoteTabs();
    loadNoteContent('editor-content', activeNoteId);
    setupToolbar();
    setupCodeModal();
    setupEditorEvents();
    setupSearch();
    setupImport();
    updateStatusBar();

    // Load EOL preference
    const savedEol = await Storage.get('eolMode');
    if (savedEol) eolMode = savedEol;

    // Quick note from tray
    window.devpad.onQuickNote(() => {
      addNote();
      App.switchTab('editor');
    });

    // Auto-save loop (10 seconds)
    setInterval(() => {
      saveCurrentNote();
    }, 10000);
  }

  // ─── Note Tabs ───────────────────────────────────────
  function renderNoteTabs() {
    const container = document.getElementById('note-tabs');
    container.innerHTML = '';

    // Sort: pinned first, then by order
    const sorted = [...notes].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    sorted.forEach(note => {
      const isActiveInAnyPane = Object.values(activeNotes).includes(note.id);
      const isPrimaryActive = activeNotes[activePaneId] === note.id;
      
      const tab = document.createElement('button');
      tab.className = `note-tab ${isActiveInAnyPane ? 'active' : ''} ${isPrimaryActive ? 'primary-active' : ''} ${note.pinned ? 'pinned' : ''}`;
      tab.dataset.id = note.id;
      tab.draggable = true;

      const pinIcon = note.pinned ? '<span class="pin-icon">📌</span>' : '';

      const nameSpan = document.createElement('span');
      nameSpan.innerHTML = pinIcon + escapeHtml(note.title);
      nameSpan.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        renameNote(note.id);
      });

      // Right-click to pin/unpin
      tab.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        note.pinned = !note.pinned;
        Storage.saveNotes(notes);
        renderNoteTabs();
        showToast(note.pinned ? '📌' : '📎', note.pinned ? 'Nota fixada' : 'Nota desafixada');
      });

      const closeBtn = document.createElement('span');
      closeBtn.className = 'note-tab-close';
      closeBtn.innerHTML = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeNote(note.id);
      });

      tab.appendChild(nameSpan);
      tab.appendChild(closeBtn);
      tab.addEventListener('click', () => switchNote(note.id));

      // ─── Drag to reorder ─────
      tab.addEventListener('dragstart', (e) => {
        tab.classList.add('dragging');
        e.dataTransfer.setData('text/plain', note.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      tab.addEventListener('dragend', () => tab.classList.remove('dragging'));
      tab.addEventListener('dragover', (e) => {
        e.preventDefault();
        tab.classList.add('drag-over');
      });
      tab.addEventListener('dragleave', () => tab.classList.remove('drag-over'));
      tab.addEventListener('drop', (e) => {
        e.preventDefault();
        tab.classList.remove('drag-over');
        const fromId = e.dataTransfer.getData('text/plain');
        reorderNotes(fromId, note.id);
      });

      container.appendChild(tab);
    });
  }

  function reorderNotes(fromId, toId) {
    if (fromId === toId) return;
    const fromIdx = notes.findIndex(n => n.id === fromId);
    const toIdx = notes.findIndex(n => n.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = notes.splice(fromIdx, 1);
    notes.splice(toIdx, 0, moved);
    Storage.saveNotes(notes);
    renderNoteTabs();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function switchNote(id) {
    saveCurrentNote();
    activeNotes[activePaneId] = id;
    if (activePaneId === 'editor-content') {
      activeNoteId = id; // update global fallback
      Storage.setActiveNoteId(id);
    }
    renderNoteTabs();
    loadNoteContent(activePaneId, id);
  }

  function loadNoteContent(paneId, id) {
    const note = notes.find(n => n.id === id);
    const editor = document.getElementById(paneId);
    if (note) {
      editor.innerHTML = note.content || '';
    }
  }

  function saveCurrentNote() {
    getAllEditors().forEach(editor => {
      const noteId = activeNotes[editor.id];
      if (!noteId) return;
      const note = notes.find(n => n.id === noteId);
      if (note) {
        note.content = editor.innerHTML;
        note.updatedAt = new Date().toISOString();
      }
    });
    Storage.debouncedSave('notes', notes);
    updateStatusBar();
      // Brief "saved" indicator
      const el = document.getElementById('status-saved');
      if (el) { el.textContent = '✓ Salvo'; }
    }
  }

  function addNote() {
    saveCurrentNote();
    const newNote = {
      id: Storage.generateId(),
      title: `Nota ${notes.length + 1}`,
      content: ''
    };
    notes.push(newNote);
    activeNotes[activePaneId] = newNote.id;
    if (activePaneId === 'editor-content') {
      activeNoteId = newNote.id;
      Storage.setActiveNoteId(activeNoteId);
    }
    
    Storage.saveNotes(notes);
    renderNoteTabs();
    loadNoteContent(activePaneId, newNote.id);
    getActiveEditor().focus();
    showToast('📝', 'Nova nota criada');
  }

  function closeNote(id) {
    if (notes.length <= 1) {
      showToast('⚠️', 'Precisa ter pelo menos uma nota');
      return;
    }
    const idx = notes.findIndex(n => n.id === id);
    notes.splice(idx, 1);

    if (Object.values(activeNotes).includes(id)) {
      // Find a safe fallback note
      const fallbackId = notes[Math.max(0, idx - 1)]?.id;
      if (activeNotes['editor-content'] === id) {
        activeNotes['editor-content'] = fallbackId;
        activeNoteId = fallbackId;
        Storage.setActiveNoteId(activeNoteId);
        loadNoteContent('editor-content', fallbackId);
      }
      if (activeNotes['editor-content-2'] === id) {
        activeNotes['editor-content-2'] = fallbackId;
        loadNoteContent('editor-content-2', fallbackId);
      }
    }

    Storage.saveNotes(notes);
    renderNoteTabs();
  }

  function renameNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    const tab = document.querySelector(`.note-tab[data-id="${id}"] span:first-child`);
    if (!tab) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = note.title;
    input.className = 'note-tab-rename';
    input.style.cssText = 'background:var(--bg-input);border:1px solid var(--accent);color:var(--text-primary);font-size:12px;padding:0 4px;width:80px;border-radius:3px;outline:none;font-family:var(--font-ui);';

    const finishRename = () => {
      note.title = input.value.trim() || note.title;
      Storage.saveNotes(notes);
      renderNoteTabs();
    };

    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = note.title; input.blur(); }
    });

    tab.replaceWith(input);
    input.focus();
    input.select();
  }

  // ─── Toolbar ─────────────────────────────────────────
  function setupToolbar() {
    // Formatting buttons
    document.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'insertCheckbox') {
          insertCheckbox();
        } else {
          document.execCommand(action, false, null);
        }
        saveCurrentNote();
      });
    });

    // Heading select
    const headSel = document.getElementById('heading-select');
    headSel?.addEventListener('change', (e) => {
      const value = e.target.value;
      if (value) {
        document.execCommand('formatBlock', false, `<${value}>`);
      } else {
        document.execCommand('formatBlock', false, '<p>');
      }
      saveCurrentNote();
    });

    // Detect current heading at cursor and update select
    getAllEditors().forEach(editor => {
      editor?.addEventListener('keyup', () => updateHeadingSelect(headSel));
      editor?.addEventListener('mouseup', () => updateHeadingSelect(headSel));
    });

    // Add note button
    document.getElementById('btn-add-note')?.addEventListener('click', addNote);

    // Add image button
    document.getElementById('btn-add-image')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) insertImageFromFile(file);
      };
      input.click();
    });
  }

  function updateHeadingSelect(select) {
    if (!select) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    let node = sel.anchorNode;
    while (node && node.id !== 'editor-content') {
      const tag = node.tagName?.toLowerCase();
      if (['h1', 'h2', 'h3', 'p', 'div'].includes(tag)) {
        select.value = ['h1', 'h2', 'h3'].includes(tag) ? tag : '';
        return;
      }
      node = node.parentNode;
    }
    select.value = '';
  }

  function insertCheckbox() {
    const div = document.createElement('div');
    div.className = 'checkbox-item';
    div.innerHTML = '<input type="checkbox" onchange="Editor.toggleCheckbox(this)"><span contenteditable="true">Nova tarefa</span>';
    const editor = getActiveEditor();

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.collapse(false);
      range.insertNode(div);
    } else {
      editor.appendChild(div);
    }
    saveCurrentNote();
  }

  function toggleCheckbox(checkbox) {
    const item = checkbox.closest('.checkbox-item');
    item.classList.toggle('checked', checkbox.checked);
    saveCurrentNote();
  }

  // ─── Code Modal ──────────────────────────────────────
  function setupCodeModal() {
    const overlay = document.getElementById('code-modal-overlay');
    const btnAdd = document.getElementById('btn-add-code');
    const btnClose = document.getElementById('code-modal-close');
    const btnCancel = document.getElementById('code-modal-cancel');
    const btnInsert = document.getElementById('code-modal-insert');

    btnAdd?.addEventListener('click', () => {
      overlay.classList.add('active');
      document.getElementById('code-input').value = '';
      document.getElementById('code-input').focus();
    });

    const closeModal = () => overlay.classList.remove('active');
    btnClose?.addEventListener('click', closeModal);
    btnCancel?.addEventListener('click', closeModal);
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    btnInsert?.addEventListener('click', () => {
      const lang = document.getElementById('code-lang-select').value;
      const code = document.getElementById('code-input').value;
      if (code.trim()) {
        insertCodeBlock(lang, code);
        closeModal();
        showToast('💻', `Bloco de código ${lang} inserido`);
      }
    });

    // Ctrl+Enter to insert
    document.getElementById('code-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        btnInsert?.click();
      }
      // Allow tab in textarea
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }
    });
  }

  function insertCodeBlock(lang, code) {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.dataset.lang = lang;

    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `
      <span>${lang}</span>
      <div class="code-block-header-actions">
        <button class="code-block-header-btn" onclick="Editor.copyCodeBlock(this)" title="Copiar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="code-block-header-btn delete" onclick="Editor.removeCodeBlock(this)" title="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'code-block-content';
    content.innerHTML = highlightCode(code, lang);

    // Store raw code as data attribute
    wrapper.dataset.rawCode = code;

    wrapper.appendChild(header);
    wrapper.appendChild(content);

    const editor = getActiveEditor();

    // Insert at cursor or append
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.collapse(false);

      // Add line break after
      const br = document.createElement('p');
      br.innerHTML = '<br>';

      range.insertNode(br);
      range.insertNode(wrapper);
    } else {
      editor.appendChild(wrapper);
      const br = document.createElement('p');
      br.innerHTML = '<br>';
      editor.appendChild(br);
    }

    saveCurrentNote();
  }

  function highlightCode(code, lang) {
    // Escape HTML
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const syntax = SYNTAX[lang];
    if (!syntax) return escaped;

    // Apply highlighting — order matters (comments last so they override)
    // Store replacements to avoid double-matching
    const tokens = [];

    // Numbers
    escaped.replace(syntax.numbers, (match, num, offset) => {
      tokens.push({ start: escaped.indexOf(match, offset > 0 ? offset - match.length + num.length : 0), length: match.length, html: `<span class="num">${match}</span>`, priority: 1 });
    });

    // Functions
    escaped = escaped.replace(syntax.functions, '<span class="fn">$1</span>');

    // Keywords
    escaped = escaped.replace(syntax.keywords, '<span class="kw">$&</span>');

    // Strings
    escaped = escaped.replace(syntax.strings, '<span class="str">$&</span>');

    // Comments (highest priority, applied last)
    escaped = escaped.replace(syntax.comments, '<span class="cmt">$&</span>');

    return escaped;
  }

  function copyCodeBlock(btn) {
    const wrapper = btn.closest('.code-block-wrapper');
    const rawCode = wrapper.dataset.rawCode || wrapper.querySelector('.code-block-content').textContent;
    navigator.clipboard.writeText(rawCode).then(() => {
      showToast('📋', 'Código copiado!');
    });
  }

  function removeCodeBlock(btn) {
    const wrapper = btn.closest('.code-block-wrapper');
    wrapper.remove();
    saveCurrentNote();
  }

  // ─── Image Handling & Split View ─────────────────────
  function setupEditorEvents() {
    // Setup Split View
    setupSplitView();

    getAllEditors().forEach(editor => {
      // Focus tracking
      editor.addEventListener('focus', () => {
        activePaneId = editor.id;
        document.querySelectorAll('.editor-pane').forEach(p => p.classList.remove('active'));
        editor.closest('.editor-pane').classList.add('active');
        renderNoteTabs();
      });

      // Paste handler (images + text)
      editor.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            e.preventDefault();
            const file = item.getAsFile();
            if (file) insertImageFromFile(file);
            return;
          }
        }

        // Auto-save after text paste
        setTimeout(saveCurrentNote, 100);
      });

      // Auto-save on input
      editor.addEventListener('input', () => {
        saveCurrentNote();
      });

      // Click on images to edit
      editor.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
          ImageEditor.open(e.target);
        }
        // Auto-link: make URLs clickable (Ctrl+Click)
        if (e.target.tagName === 'A' && e.ctrlKey) {
          e.preventDefault();
          window.open(e.target.href, '_blank');
        }
      });
    });
  }

  function setupSplitView() {
    const btnSplit = document.getElementById('btn-split-view');
    const pane2 = document.getElementById('editor-pane-2');
    const divider = document.getElementById('editor-split-divider');
    const container = document.getElementById('editor-split-container');
    
    if (!btnSplit || !pane2 || !divider || !container) return;

    btnSplit.addEventListener('click', () => {
      isSplitView = !isSplitView;
      if (isSplitView) {
        pane2.style.display = 'flex';
        divider.style.display = 'block';
        btnSplit.classList.add('active');
        
        // Carrega a mesma nota no segundo painel se estiver vazio
        if (!activeNotes['editor-content-2']) {
          activeNotes['editor-content-2'] = activeNotes['editor-content'];
        }
        loadNoteContent('editor-content-2', activeNotes['editor-content-2']);
      } else {
        pane2.style.display = 'none';
        divider.style.display = 'none';
        btnSplit.classList.remove('active');
        activePaneId = 'editor-content';
        document.getElementById('editor-pane-1').classList.add('active');
      }
      renderNoteTabs();
    });

    // Resize logic
    let isResizing = false;
    divider.addEventListener('mousedown', (e) => {
      isResizing = true;
      divider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const containerRect = container.getBoundingClientRect();
      const leftWidth = e.clientX - containerRect.left;
      const percentage = (leftWidth / containerRect.width) * 100;
      
      if (percentage > 10 && percentage < 90) {
        document.getElementById('editor-pane-1').style.flex = `0 0 ${percentage}%`;
        document.getElementById('editor-pane-2').style.flex = '1';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        divider.classList.remove('dragging');
        document.body.style.cursor = 'default';
      }
    });
  }

  // ─── Auto-link URLs ──────────────────────────────────
  function autoLinkUrls() {
    getAllEditors().forEach(editor => {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
    const textNodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.parentElement?.tagName !== 'A' &&
          !walker.currentNode.parentElement?.closest('.code-block-wrapper') &&
          urlRegex.test(walker.currentNode.textContent)) {
        textNodes.push(walker.currentNode);
      }
      urlRegex.lastIndex = 0;
    }
    textNodes.forEach(node => {
      const text = node.textContent;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      text.replace(urlRegex, (match, url, offset) => {
        if (offset > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, offset)));
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        a.title = 'Ctrl+Click para abrir';
        a.style.color = 'var(--accent)';
        a.style.textDecoration = 'underline';
        frag.appendChild(a);
        lastIdx = offset + match.length;
      });
      if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      node.replaceWith(frag);
    });
    });
  }

  // ─── Search ──────────────────────────────────────────
  function setupSearch() {
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-input');
    const searchClose = document.getElementById('search-close');
    const searchCount = document.getElementById('search-count');

    function openSearch() {
      searchBar.classList.remove('hidden');
      searchInput.focus();
      searchInput.select();
    }

    function closeSearch() {
      searchBar.classList.add('hidden');
      searchInput.value = '';
      searchCount.textContent = '';
      clearHighlights();
    }

    searchClose?.addEventListener('click', closeSearch);

    searchInput?.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (!query) { clearHighlights(); searchCount.textContent = ''; return; }
      highlightSearch(query);
    });

    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
    });

    // Expose for shortcuts
    Editor._openSearch = openSearch;
    Editor._closeSearch = closeSearch;
  }

  function highlightSearch(query) {
    const editor = getActiveEditor();
    const countEl = document.getElementById('search-count');
    clearHighlights();

    if (!query) return;

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
    const matches = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('.code-block-header')) continue;
      const idx = node.textContent.toLowerCase().indexOf(query.toLowerCase());
      if (idx !== -1) matches.push({ node, idx, length: query.length });
    }

    // Highlight (from last to first to preserve indices)
    [...matches].reverse().forEach((m, i) => {
      const range = document.createRange();
      range.setStart(m.node, m.idx);
      range.setEnd(m.node, m.idx + m.length);
      const mark = document.createElement('mark');
      mark.className = `search-highlight ${i === matches.length - 1 ? 'active' : ''}`;
      range.surroundContents(mark);
    });

    countEl.textContent = matches.length > 0 ? `${matches.length} encontrado${matches.length === 1 ? '' : 's'}` : 'Nenhum';

    // Scroll first match into view
    const first = editor.querySelector('.search-highlight.active');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearHighlights() {
    document.querySelectorAll('.search-highlight').forEach(mark => {
      const parent = mark.parentNode;
      mark.replaceWith(...mark.childNodes);
      parent.normalize();
    });
  }

  // ─── Import Files ────────────────────────────────────
  function setupImport() {
    document.getElementById('btn-import-file')?.addEventListener('click', importFiles);
  }

  async function importFiles() {
    const result = await window.devpad.openFileDialog();
    if (result.canceled || !result.files.length) return;

    for (const file of result.files) {
      // Convert plain text to HTML paragraphs
      const html = file.content
        .split('\n')
        .map(line => `<p>${line || '<br>'}</p>`)
        .join('');

      const newNote = {
        id: Storage.generateId(),
        title: file.name,
        content: html,
        updatedAt: new Date().toISOString()
      };
      notes.push(newNote);
      activeNoteId = newNote.id;
    }

    Storage.saveNotes(notes);
    Storage.setActiveNoteId(activeNoteId);
    renderNoteTabs();
    loadNoteContent(activeNoteId);
    showToast('📥', `${result.files.length} nota${result.files.length > 1 ? 's' : ''} importada${result.files.length > 1 ? 's' : ''}`);
  }

  // ─── Status Bar ──────────────────────────────────────
  function updateStatusBar() {
    const editor = getActiveEditor();
    if (!editor) return;

    const text = editor.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.replace(/\s/g, '').length;

    document.getElementById('status-words').textContent = `${words} palavra${words !== 1 ? 's' : ''}`;
    document.getElementById('status-chars').textContent = `${chars} caractere${chars !== 1 ? 's' : ''}`;

    // EOL indicator
    const eolEl = document.getElementById('status-eol');
    if (eolEl) {
      eolEl.textContent = eolMode;
      eolEl.onclick = () => {
        eolMode = eolMode === 'LF' ? 'CRLF' : 'LF';
        eolEl.textContent = eolMode;
        Storage.set('eolMode', eolMode);
      };
    }

    const note = notes.find(n => n.id === activeNotes[activePaneId]);
    if (note?.updatedAt) {
      const d = new Date(note.updatedAt);
      document.getElementById('status-date').textContent = d.toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    }
  }

  // ─── Focus Mode ──────────────────────────────────────
  function toggleFocusMode() {
    document.body.classList.toggle('focus-mode');
    const active = document.body.classList.contains('focus-mode');
    showToast(active ? '🎯' : '📋', active ? 'Modo Foco ativado (Esc para sair)' : 'Modo Foco desativado');
  }

  function insertImageFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '100%';
      img.title = 'Clique para editar';

      const editor = getActiveEditor();
      const selection = window.getSelection();

      if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.collapse(false);
        range.insertNode(img);
      } else {
        editor.appendChild(img);
      }

      // Add a paragraph after the image
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      img.after(p);

      saveCurrentNote();
      showToast('🖼️', 'Imagem inserida! Clique nela para editar.');
    };
    reader.readAsDataURL(file);
  }

  // ─── Export Note ──────────────────────────────────────
  async function exportCurrentNote() {
    const note = notes.find(n => n.id === activeNoteId);
    if (!note) return;

    saveCurrentNote();

    const defaultName = (note.title || 'nota').replace(/[^a-zA-Z0-9_\- ]/g, '') + '.md';
    const result = await window.devpad.saveFileDialog(defaultName);

    if (result.canceled || !result.filePath) return;

    const filePath = result.filePath;
    const ext = filePath.split('.').pop().toLowerCase();

    let content;
    if (ext === 'md' || ext === 'txt') {
      content = htmlToText(note.content, ext === 'md');
    } else {
      content = htmlToText(note.content, false);
    }

    // Apply EOL mode
    if (eolMode === 'CRLF') {
      content = content.replace(/\n/g, '\r\n');
    }

    const writeResult = await window.devpad.writeFile(filePath, content);
    if (writeResult.success) {
      showToast('📁', `Nota exportada: ${filePath.split(/[/\\]/).pop()}`);
    } else {
      showToast('❌', `Erro ao exportar: ${writeResult.error}`);
    }
  }

  function htmlToText(html, asMarkdown) {
    const div = document.createElement('div');
    div.innerHTML = html;
    let text = '';

    function walk(node) {
      if (node.nodeType === 3) {
        text += node.textContent;
        return;
      }
      if (node.nodeType !== 1) return;

      const tag = node.tagName?.toLowerCase();

      // Code blocks
      if (node.classList?.contains('code-block-wrapper')) {
        const lang = node.dataset.lang || '';
        const code = node.dataset.rawCode || node.querySelector('.code-block-content')?.textContent || '';
        if (asMarkdown) {
          text += `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
        } else {
          text += `\n--- ${lang} ---\n${code}\n---\n`;
        }
        return;
      }

      // Checkboxes
      if (node.classList?.contains('checkbox-item')) {
        const checked = node.querySelector('input')?.checked;
        const label = node.querySelector('span')?.textContent || '';
        text += `${checked ? '[x]' : '[ ]'} ${label}\n`;
        return;
      }

      // Block-level elements
      if (['p', 'div'].includes(tag)) {
        if (text && !text.endsWith('\n')) text += '\n';
        node.childNodes.forEach(walk);
        text += '\n';
        return;
      }

      if (tag === 'br') { text += '\n'; return; }

      if (tag === 'h1') {
        if (text && !text.endsWith('\n')) text += '\n';
        text += asMarkdown ? '# ' : '';
        node.childNodes.forEach(walk);
        text += '\n';
        return;
      }
      if (tag === 'h2') {
        if (text && !text.endsWith('\n')) text += '\n';
        text += asMarkdown ? '## ' : '';
        node.childNodes.forEach(walk);
        text += '\n';
        return;
      }
      if (tag === 'h3') {
        if (text && !text.endsWith('\n')) text += '\n';
        text += asMarkdown ? '### ' : '';
        node.childNodes.forEach(walk);
        text += '\n';
        return;
      }

      if (tag === 'strong' || tag === 'b') {
        text += asMarkdown ? '**' : '';
        node.childNodes.forEach(walk);
        text += asMarkdown ? '**' : '';
        return;
      }
      if (tag === 'em' || tag === 'i') {
        text += asMarkdown ? '*' : '';
        node.childNodes.forEach(walk);
        text += asMarkdown ? '*' : '';
        return;
      }

      if (tag === 'li') {
        text += asMarkdown ? '- ' : '• ';
        node.childNodes.forEach(walk);
        text += '\n';
        return;
      }

      if (tag === 'img') {
        text += asMarkdown ? `![image](${node.src?.substring(0, 50)}...)\n` : '[imagem]\n';
        return;
      }

      node.childNodes.forEach(walk);
    }

    walk(div);
    return text.replace(/\n{3,}/g, '\n\n').trim();
  }

  // ─── Public API ──────────────────────────────────────
  return {
    init,
    addNote,
    saveCurrentNote,
    exportCurrentNote,
    toggleCheckbox,
    copyCodeBlock,
    removeCodeBlock,
    toggleFocusMode,
    importFiles,
    _openSearch: null,
    _closeSearch: null
  };
})();
