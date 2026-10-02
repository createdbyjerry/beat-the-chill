/**
 * Panel corner ornaments.
 * Injects the four root/branch corner images into every `.panel` on the page.
 * Sizes and offsets come from the --root-* tokens (see tokens/tokens.json);
 * add `.small-roots` or `.hud-roots` to a panel for the smaller variants.
 */
document
  .querySelectorAll('.panel')
  .forEach((p) =>
    p.insertAdjacentHTML(
      'afterbegin',
      ['tl', 'tr', 'bl', 'br'].map((c) => `<i class="root ${c}" aria-hidden="true"></i>`).join(''),
    ),
  );
