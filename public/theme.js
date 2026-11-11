// Apply display preferences before first paint. No network requests or tracking.
(() => {
  const themeKey = 'jamie-parr-theme';
  const accessKey = 'jamie-parr-accessibility';
  const valid = value => ['light', 'dark'].includes(value) ? value : 'system';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const defaults = () => ({ largeText: false, contrast: false, reduceMotion: false });
  let choice = 'system', preferences = defaults();
  function read() {
    choice = 'system'; preferences = defaults();
    try { choice = valid(localStorage.getItem(themeKey)); } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem(accessKey));
      for (const key of Object.keys(preferences)) preferences[key] = saved?.[key] === true;
    } catch {}
  }
  function save() {
    try {
      if (choice === 'system') localStorage.removeItem(themeKey);
      else localStorage.setItem(themeKey, choice);
      if (Object.values(preferences).some(Boolean)) localStorage.setItem(accessKey, JSON.stringify(preferences));
      else localStorage.removeItem(accessKey);
    } catch { /* Controls still work when storage is unavailable. */ }
  }
  function apply() {
    const root = document.documentElement;
    const attr = (name, value) => value ? root.setAttribute(name, value) : root.removeAttribute(name);
    attr('data-theme', choice === 'system' ? null : choice);
    attr('data-large-text', preferences.largeText ? 'true' : null);
    attr('data-contrast', preferences.contrast ? 'more' : null);
    attr('data-reduce-motion', preferences.reduceMotion || motion.matches ? 'true' : null);
    document.querySelectorAll('input[name="colour-theme"]').forEach(input => { input.checked = input.value === choice; });
    document.querySelectorAll('[data-preference]').forEach(input => {
      const name = input.dataset.preference;
      input.checked = preferences[name] || (name === 'reduceMotion' && motion.matches);
      input.disabled = name === 'reduceMotion' && motion.matches;
    });
  }
  read(); apply();
  system.addEventListener('change', apply);
  motion.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if ([themeKey, accessKey, null].includes(event.key)) { read(); apply(); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const settings = document.getElementById('display-settings');
    if (!settings) return;
    settings.hidden = false;
    apply();
    settings.addEventListener('change', event => {
      const input = event.target;
      if (input.name === 'colour-theme') choice = valid(input.value);
      else if (Object.hasOwn(preferences, input.dataset.preference)) preferences[input.dataset.preference] = input.checked;
      apply(); save();
    });
    document.getElementById('reset-preferences').addEventListener('click', () => {
      choice = 'system'; preferences = defaults(); apply(); save();
    });
    const close = restoreFocus => {
      if (!settings.open) return;
      settings.open = false;
      if (restoreFocus) settings.querySelector('summary').focus();
    };
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && settings.open) { close(true); event.preventDefault(); }
    });
    document.addEventListener('pointerdown', event => { if (!settings.contains(event.target)) close(false); });
    settings.addEventListener('focusout', event => { if (event.relatedTarget && !settings.contains(event.relatedTarget)) close(false); });
  });
})();
