/* ═══════════════════════════════════════════════════════════
   IMAGE EDITOR — DevPad
   Canvas-based image editing: draw, resize
   Uses native Canvas API (no Fabric.js dependency for lighter build)
   ═══════════════════════════════════════════════════════════ */

const ImageEditor = (() => {
  let canvas, ctx;
  let currentImage = null;  // The <img> element being edited
  let originalImage = null; // Original image data
  let isDrawing = false;
  let drawMode = false;
  let resizeMode = false;
  let brushColor = '#ff2d55';
  let brushSize = 3;
  let aspectRatio = 1;
  let history = [];

  function init() {
    canvas = document.getElementById('image-editor-canvas');
    ctx = canvas?.getContext('2d');

    setupControls();
  }

  function setupControls() {
    // Draw button
    document.getElementById('img-draw')?.addEventListener('click', () => {
      drawMode = !drawMode;
      resizeMode = false;
      document.getElementById('img-draw').classList.toggle('active', drawMode);
      document.getElementById('img-resize').classList.toggle('active', false);
      document.getElementById('image-resize-controls').style.display = 'none';
      canvas.style.cursor = drawMode ? 'crosshair' : 'default';
    });

    // Resize button
    document.getElementById('img-resize')?.addEventListener('click', () => {
      resizeMode = !resizeMode;
      drawMode = false;
      document.getElementById('img-resize').classList.toggle('active', resizeMode);
      document.getElementById('img-draw').classList.toggle('active', false);
      document.getElementById('image-resize-controls').style.display = resizeMode ? 'flex' : 'none';
      canvas.style.cursor = 'default';
    });

    // Color picker
    document.getElementById('img-color')?.addEventListener('input', (e) => {
      brushColor = e.target.value;
    });

    // Brush size
    document.getElementById('img-brush-size')?.addEventListener('input', (e) => {
      brushSize = parseInt(e.target.value);
    });

    // Resize inputs
    const widthInput = document.getElementById('img-width');
    const heightInput = document.getElementById('img-height');
    const lockRatio = document.getElementById('img-lock-ratio');

    widthInput?.addEventListener('input', (e) => {
      if (lockRatio?.checked) {
        heightInput.value = Math.round(parseInt(e.target.value) / aspectRatio);
      }
    });

    heightInput?.addEventListener('input', (e) => {
      if (lockRatio?.checked) {
        widthInput.value = Math.round(parseInt(e.target.value) * aspectRatio);
      }
    });

    // Canvas drawing events
    canvas?.addEventListener('mousedown', startDraw);
    canvas?.addEventListener('mousemove', draw);
    canvas?.addEventListener('mouseup', stopDraw);
    canvas?.addEventListener('mouseleave', stopDraw);

    // Modal buttons
    document.getElementById('image-editor-close')?.addEventListener('click', close);
    document.getElementById('image-editor-cancel')?.addEventListener('click', close);
    document.getElementById('image-editor-save')?.addEventListener('click', save);

    // Overlay click
    document.getElementById('image-editor-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'image-editor-overlay') close();
    });
  }

  function open(imgElement) {
    currentImage = imgElement;
    const overlay = document.getElementById('image-editor-overlay');
    overlay.classList.add('active');

    // Load image into canvas
    const img = new Image();
    img.onload = () => {
      // Scale canvas to fit in modal
      const maxW = 700;
      const maxH = 450;
      let w = img.width;
      let h = img.height;

      if (w > maxW) { h = h * (maxW / w); w = maxW; }
      if (h > maxH) { w = w * (maxH / h); h = maxH; }

      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      aspectRatio = canvas.width / canvas.height;

      // Set resize inputs
      document.getElementById('img-width').value = canvas.width;
      document.getElementById('img-height').value = canvas.height;

      // Save initial state
      originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      history = [originalImage];
    };
    img.src = imgElement.src;

    // Reset modes
    drawMode = false;
    resizeMode = false;
    isDrawing = false;
    document.getElementById('img-draw')?.classList.remove('active');
    document.getElementById('img-resize')?.classList.remove('active');
    document.getElementById('image-resize-controls').style.display = 'none';
    canvas.style.cursor = 'default';
  }

  function close() {
    document.getElementById('image-editor-overlay').classList.remove('active');
    currentImage = null;
    history = [];
  }

  function save() {
    if (!currentImage || !canvas) return;

    // If resize mode, apply resize
    if (resizeMode) {
      const newW = parseInt(document.getElementById('img-width').value);
      const newH = parseInt(document.getElementById('img-height').value);

      if (newW > 0 && newH > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newW;
        tempCanvas.height = newH;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0, newW, newH);

        currentImage.src = tempCanvas.toDataURL('image/png');
        currentImage.style.width = newW + 'px';
      }
    } else {
      currentImage.src = canvas.toDataURL('image/png');
    }

    Editor.saveCurrentNote();
    showToast('🖼️', 'Imagem atualizada!');
    close();
  }

  // ─── Drawing ─────────────────────────────────────────
  function startDraw(e) {
    if (!drawMode) return;
    isDrawing = true;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function draw(e) {
    if (!isDrawing || !drawMode) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw() {
    if (isDrawing) {
      isDrawing = false;
      ctx.closePath();
      // Save state for undo
      history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
  }

  return { init, open, close };
})();
