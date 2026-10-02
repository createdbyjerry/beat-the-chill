#!/usr/bin/env node
/**
 * build-tokens.mjs
 * Converts tokens/tokens.json -> assets/css/tokens.css
 *
 * Usage:
 *   node scripts/build-tokens.mjs           build once
 *   node scripts/build-tokens.mjs --watch   rebuild when tokens.json changes
 *   node scripts/build-tokens.mjs --check   exit 1 if tokens.css is out of date (for CI)
 *
 * Token format (loosely follows the W3C Design Tokens draft):
 *   {
 *     "<group>": {
 *       "$description": "optional",
 *       "$type": "color | dimension | fontFamily | asset | ...",   (inherited by tokens)
 *       "$selector": ".some-class",                                 (optional, default ":root")
 *       "<token-name>": { "$value": "...", "$type": "...", "$description": "..." }
 *     }
 *   }
 *
 * - Each token becomes `--<token-name>` (the group name is NOT prefixed, so names
 *   stay identical to the ones used throughout styles.css and the game).
 * - `{group.token}` references become `var(--token)`.
 * - `$type: "asset"` values are wrapped in url('...').
 * - Groups sharing a selector are merged into one CSS block.
 */

import { readFileSync, writeFileSync, watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'tokens/tokens.json');
const OUT = resolve(ROOT, 'assets/css/tokens.css');

const args = new Set(process.argv.slice(2));

function isToken(node) {
  return node && typeof node === 'object' && '$value' in node;
}

function build() {
  const tokens = JSON.parse(readFileSync(SRC, 'utf8'));

  // Index every token so references can be validated.
  const index = new Map();
  for (const [group, body] of Object.entries(tokens)) {
    if (group.startsWith('$')) continue;
    for (const [name, tok] of Object.entries(body)) {
      if (name.startsWith('$') || !isToken(tok)) continue;
      index.set(`${group}.${name}`, name);
    }
  }

  const resolveValue = (raw, type, path) => {
    let value = String(raw).replace(/\{([^}]+)\}/g, (_, ref) => {
      if (!index.has(ref)) throw new Error(`Unknown token reference {${ref}} in ${path}`);
      return `var(--${index.get(ref)})`;
    });
    if (type === 'asset' && !value.startsWith('url(') && !value.startsWith('var(')) {
      value = `url('${value}')`;
    }
    return value;
  };

  // selector -> array of lines
  const blocks = new Map();
  const seen = new Map(); // `${selector}|${name}` -> path, to catch duplicates

  for (const [group, body] of Object.entries(tokens)) {
    if (group.startsWith('$')) continue;
    const selector = body.$selector || ':root';
    const groupType = body.$type;
    if (!blocks.has(selector)) blocks.set(selector, []);
    const lines = blocks.get(selector);

    lines.push(`  /* ${group}${body.$description ? ' — ' + body.$description : ''} */`);
    for (const [name, tok] of Object.entries(body)) {
      if (name.startsWith('$') || !isToken(tok)) continue;
      const path = `${group}.${name}`;
      const key = `${selector}|${name}`;
      if (seen.has(key)) {
        throw new Error(`Duplicate variable --${name} in "${selector}" (${seen.get(key)} and ${path})`);
      }
      seen.set(key, path);
      const value = resolveValue(tok.$value, tok.$type || groupType, path);
      lines.push(`  --${name}: ${value};`);
    }
    lines.push('');
  }

  let css =
    '/*\n' +
    ' * GENERATED FILE — do not edit by hand.\n' +
    ' * Source: tokens/tokens.json\n' +
    ' * Rebuild: npm run build:tokens\n' +
    ' */\n\n';

  for (const [selector, lines] of blocks) {
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    css += `${selector} {\n${lines.join('\n')}\n}\n\n`;
  }
  return css.trimEnd() + '\n';
}

function write() {
  try {
    const css = build();
    writeFileSync(OUT, css);
    console.log(`✓ tokens.css written (${css.length} bytes)`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    if (!args.has('--watch')) process.exit(1);
  }
}

if (args.has('--check')) {
  let current = '';
  try { current = readFileSync(OUT, 'utf8'); } catch {}
  if (build() !== current) {
    console.error('✗ assets/css/tokens.css is out of date. Run `npm run build:tokens` and commit the result.');
    process.exit(1);
  }
  console.log('✓ tokens.css is up to date');
} else {
  write();
  if (args.has('--watch')) {
    console.log('Watching tokens/tokens.json…');
    let t;
    watch(SRC, () => { clearTimeout(t); t = setTimeout(write, 50); });
  }
}
