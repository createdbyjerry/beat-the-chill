/**
 * Design-system page: renders color swatches straight from tokens/tokens.json,
 * so the docs never drift from the source of truth.
 */
(async function renderSwatches() {
  const toast = document.querySelector('.ds-toast');
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1400);
  };

  let tokens;
  try {
    const res = await fetch('tokens/tokens.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    tokens = await res.json();
  } catch (err) {
    document.querySelectorAll('.ds-swatches').forEach((el) => {
      el.innerHTML =
        '<p class="ds-lede">Couldn\u2019t load tokens/tokens.json. Open this page through a local server (npm start) rather than straight from the file system.</p>';
    });
    console.error(err);
    return;
  }

  const rootStyle = getComputedStyle(document.documentElement);

  document.querySelectorAll('.ds-swatches[data-group]').forEach((container) => {
    const group = tokens[container.dataset.group];
    if (!group) return;
    for (const [name, tok] of Object.entries(group)) {
      if (name.startsWith('$') || !tok || !('$value' in tok)) continue;
      const cssVar = `--${name}`;
      const resolved = rootStyle.getPropertyValue(cssVar).trim();
      const isRef = /^\{.+\}$/.test(tok.$value);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ds-swatch';
      btn.setAttribute('aria-label', `Copy var(${cssVar})`);
      btn.innerHTML = `
        <div class="ds-chip" style="background: var(${cssVar})"></div>
        <div class="ds-swatch-body">
          <div class="ds-swatch-name">${cssVar}</div>
          <div class="ds-swatch-val">${isRef ? tok.$value + ' → ' : ''}${resolved || tok.$value}</div>
          ${tok.$description ? `<div class="ds-swatch-desc">${tok.$description}</div>` : ''}
        </div>`;
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(`var(${cssVar})`);
          showToast(`Copied var(${cssVar})`);
        } catch {
          showToast(`var(${cssVar})`);
        }
      });
      container.appendChild(btn);
    }
  });
})();
