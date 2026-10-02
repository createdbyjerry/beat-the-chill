# Beat the Chill

After a grizzly shredded Jack's clothes, he must race the setting sun to survive the freezing night. Sprint across a tiny curved world, chop down every tree, and gather the wood to light a fire before midnight.

A browser game prototype built with [Three.js](https://threejs.org/), plus the design system behind its UI.

| | Link |
|---|---|
| Play the game | `https://<your-username>.github.io/<repo-name>/` |
| Design system | `https://<your-username>.github.io/<repo-name>/design-system.html` |

> Replace the placeholders above once GitHub Pages is enabled (see [Deploying](#deploying-to-github-pages)).

---

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Walk forward / back | `W` `S` or `↑` `↓` | ▲ ▼ |
| Turn left / right | `A` `D` or `←` `→` | ◀ ▶ |
| Chop | `Space` | 🪓 |
| Pause | `P` or `Esc` | ❚❚ |
| Restart | `R` | — |

The touch pad appears automatically on screens narrower than 860px or on touch devices. After you collect all the wood, drag to orbit the camera around the campfire.

---

## Project structure

```
.
├── index.html                  # The game
├── design-system.html          # Living style guide (tokens + components)
├── tokens/
│   └── tokens.json             # ⭐ Source of truth for all design tokens
├── scripts/
│   └── build-tokens.mjs        # tokens.json → assets/css/tokens.css
├── assets/
│   ├── css/
│   │   ├── tokens.css          # GENERATED — do not edit by hand
│   │   ├── styles.css          # Game components & layout (uses tokens only)
│   │   └── design-system.css   # Design-system page layout
│   ├── js/
│   │   ├── game.js             # Three.js game module
│   │   ├── ornaments.js        # Adds root corner ornaments to every .panel
│   │   └── design-system.js    # Renders swatches from tokens.json
│   └── img/
│       ├── beat-the-chill-cornerImg.png       # Panel corner root
│       └── beat-the-chill-cornerImg-bttn.png  # CTA hover curl
├── .github/workflows/
│   └── tokens-check.yml        # CI: fails if tokens.css is stale
├── .nojekyll                   # Serve files as-is on GitHub Pages
└── package.json                # Token + dev-server scripts (no dependencies)
```

### External assets

- **3D models** (`.glb` character animations, tree, wood, fire) are streamed from Supabase storage. The base URL is `ASSET_BASE` near the top of `assets/js/game.js`.
- **Three.js r160** loads from jsDelivr through the import map in `index.html`.
- **Inter** loads from Google Fonts.

The two UI images now live in `assets/img/` instead of the Webflow CDN.

---

## Design tokens

All colors, fonts, ornament sizes, and UI images are defined once in **`tokens/tokens.json`** and compiled into CSS custom properties in **`assets/css/tokens.css`**. Component styles in `styles.css` only reference `var(--…)`, never raw values.

### Editing tokens

1. Edit `tokens/tokens.json`.
2. Run the build:
   ```bash
   npm run build:tokens
   ```
3. Commit **both** `tokens.json` and the regenerated `tokens.css`.

While iterating, `npm run watch:tokens` rebuilds on every save. The build script uses only Node built-ins, so there's no `npm install` step. Node 18 or newer is required.

### Format

```jsonc
{
  "color": {                                   // group (becomes a comment in the CSS)
    "$type": "color",                          // inherited by every token in the group
    "primary": {
      "$value": "#9C663E",
      "$description": "Bark brown."            // optional, shown on the design-system page
    }
  },
  "semantic": {
    "text-hi": { "$value": "{color.primary-20}" }   // reference → var(--primary-20)
  },
  "ornament-small": {
    "$selector": ".panel.small-roots",         // emit this group under a custom selector
    "root-w": { "$value": "44px" }
  }
}
```

Build rules:

| Rule | Example |
|---|---|
| The token key is the CSS variable name; the group isn't prefixed. | `color.primary` → `--primary` |
| `{group.token}` references compile to `var()`. | `{color.bg}` → `var(--bg)` |
| `$type: "asset"` values are wrapped in `url()`. Paths are relative to `assets/css/`. | `../img/x.png` → `url('../img/x.png')` |
| Groups go in `:root` unless `$selector` is set. | `.panel.hud-roots { --root-w: 34px; … }` |
| Duplicate names within a selector and unknown references fail the build. | |

### Token groups

| Group | What it holds |
|---|---|
| `color` | Primitive palette: bark browns (`primary`), pine greens (`secondary`), parchment (`bg`), neutrals (`contrast`), and the night `scene-bg`. |
| `semantic` | Role aliases: `text-hi`, `text-lo`, `panel-bg`, `panel-line`, `scrim`. Prefer these in components. |
| `typography` | `font-sans` stack. |
| `asset` | `root-img` (panel corners) and `curl-img` (CTA hover curl). |
| `ornament`, `ornament-small`, `ornament-hud` | Corner root size and offset for each panel variant. |

### CI check

`.github/workflows/tokens-check.yml` runs `npm run check:tokens` on pushes and pull requests that touch tokens. It fails if `tokens.css` doesn't match what `tokens.json` would generate, which catches a forgotten rebuild.

---

## Running locally

The game uses ES modules and the design-system page fetches `tokens.json`, so open them through a local server instead of double-clicking the HTML file:

```bash
npm start            # http-server on http://localhost:8080
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080/` for the game or `http://localhost:8080/design-system.html` for the design system.

---

## Deploying to GitHub Pages

1. Push this repo to GitHub with everything at the repository root.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
4. Choose branch **`main`** and folder **`/ (root)`**, then **Save**.
5. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

There's no build step on deploy. `tokens.css` is committed, so Pages serves the files exactly as they are in the repo. All paths are relative, so the site works under the `/<repo-name>/` subpath without changes.

---

## Credits

Designed by **Jerry Borunda**.
