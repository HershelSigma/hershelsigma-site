// footer Light/Dark switch for the guide pages; the choice is shared with the homepage via localStorage "hs-theme"
(() => {
  const root = document.documentElement;
  const buttons = document.querySelectorAll('[data-theme-set]');
  const sync = () => {
    const t = root.dataset.theme === 'dark' ? 'dark' : 'light';
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
  };
  buttons.forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.themeSet === 'dark') root.dataset.theme = 'dark'; else delete root.dataset.theme;
    try { localStorage.setItem('hs-theme', b.dataset.themeSet); } catch (e) { /* storage blocked: the choice lasts this visit */ }
    sync();
  }));
  sync();
})();
