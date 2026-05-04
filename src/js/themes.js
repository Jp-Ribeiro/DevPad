/* ═══════════════════════════════════════════════════════════
   THEMES — DevPad
   Theme switching with live preview
   ═══════════════════════════════════════════════════════════ */

const Themes = (() => {
  const THEMES = ['dark', 'light', 'dev-glow'];
  let currentTheme = 'dark';

  function init(theme) {
    currentTheme = theme || 'dark';
    applyTheme(currentTheme);
    setupThemeCards();
  }

  function applyTheme(theme) {
    if (!THEMES.includes(theme)) theme = 'dark';
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    // Update theme cards active state
    document.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('active', card.dataset.theme === theme);
    });
  }

  function setupThemeCards() {
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        applyTheme(theme);
        Storage.saveSettings({ ...Settings.current(), theme });
      });
    });
  }

  function getTheme() {
    return currentTheme;
  }

  return { init, applyTheme, getTheme };
})();

// Settings helper
const Settings = (() => {
  let _settings = {
    theme: 'dark',
    opacity: 1.0,
    alwaysOnTop: false
  };

  async function init() {
    _settings = await Storage.getSettings();
    Themes.init(_settings.theme);

    // Opacity
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    if (opacitySlider) {
      opacitySlider.value = Math.round((_settings.opacity || 1) * 100);
      opacityValue.textContent = opacitySlider.value + '%';
      opacitySlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        opacityValue.textContent = e.target.value + '%';
        window.devpad.setOpacity(val);
        _settings.opacity = val;
        Storage.saveSettings(_settings);
      });
    }

    // Always on Top
    const aotToggle = document.getElementById('always-on-top-toggle');
    if (aotToggle) {
      aotToggle.checked = _settings.alwaysOnTop || false;
      aotToggle.addEventListener('change', (e) => {
        _settings.alwaysOnTop = e.target.checked;
        window.devpad.setAlwaysOnTop(e.target.checked);
        Storage.saveSettings(_settings);
      });
    }

    // Ghost Mode (invisible during screen share)
    const ghostToggle = document.getElementById('ghost-mode-toggle');
    if (ghostToggle) {
      ghostToggle.checked = _settings.ghostMode !== false; // default true
      ghostToggle.addEventListener('change', (e) => {
        _settings.ghostMode = e.target.checked;
        window.devpad.setGhostMode(e.target.checked);
        Storage.saveSettings(_settings);
      });
    }

    // Auto Start
    const autoStartToggle = document.getElementById('auto-start-toggle');
    if (autoStartToggle) {
      autoStartToggle.checked = _settings.autoStart || false;
      autoStartToggle.addEventListener('change', (e) => {
        _settings.autoStart = e.target.checked;
        window.devpad.setAutoStart(e.target.checked);
        Storage.saveSettings(_settings);
      });
    }

    // Listen for external setting changes
    window.devpad.onSettingsUpdated((settings) => {
      _settings = settings;
      Themes.applyTheme(settings.theme);
      if (opacitySlider) {
        opacitySlider.value = Math.round((settings.opacity || 1) * 100);
        opacityValue.textContent = opacitySlider.value + '%';
      }
      if (aotToggle) {
        aotToggle.checked = settings.alwaysOnTop || false;
      }
      if (ghostToggle) {
        ghostToggle.checked = settings.ghostMode !== false;
      }
    });
  }

  function current() {
    return { ..._settings };
  }

  return { init, current };
})();
