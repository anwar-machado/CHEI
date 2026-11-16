// CHEI — build: copies the site into dist/ and runs safety checks.
// No dependencies (Node >= 18). Usage: node scripts/build.mjs
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

// Only these files/folders are published (README, scripts, package.json… stay out).
const PUBLISH = ['index.html', 'robots.txt', '_headers', '.well-known', 'css', 'js', 'assets'];

// Links that may leave the site (navigation only — never loaded as resources).
const ALLOWED_EXTERNAL_LINKS = [/^https:\/\/wa\.me\//, /^mailto:/, /^tel:/];

const errors = [];
const fail = (msg) => errors.push(msg);

/* ---------- 1. Clean & copy ---------- */
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const entry of PUBLISH) {
  const from = join(root, entry);
  if (!existsSync(from)) { fail(`Missing: ${entry}`); continue; }
  cpSync(from, join(dist, entry), { recursive: true });
}
// GitHub Pages: don't run Jekyll (it would hide .well-known/ and _headers)
writeFileSync(join(dist, '.nojekyll'), '');

/* ---------- 2. Light minification (comments & indentation only — safe) ---------- */
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

for (const file of walk(dist)) {
  if (file.endsWith('.css')) {
    const css = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
    writeFileSync(file, css + '\n');
  }
  if (file.endsWith('.html')) {
    const html = readFileSync(file, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .split('\n').map((l) => l.trimEnd()).filter((l) => l.trim()).join('\n');
    writeFileSync(file, html + '\n');
  }
}

/* ---------- 3. Safety checks ---------- */
const html = readFileSync(join(dist, 'index.html'), 'utf8');

// a) Every local file referenced by HTML/CSS exists
const refs = [...html.matchAll(/\s(?:src|href)="([^"#?]+)/g)].map((m) => m[1]);
for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
  m[1].split(',').forEach((part) => refs.push(part.trim().split(/\s+/)[0]));
}
for (const ref of refs) {
  if (/^(https?:|mailto:|tel:)/.test(ref)) {
    if (!ALLOWED_EXTERNAL_LINKS.some((re) => re.test(ref))) fail(`External URL not allowed: ${ref}`);
    continue;
  }
  if (!existsSync(join(dist, ref))) fail(`Broken reference in index.html: ${ref}`);
}
for (const cssFile of walk(join(dist, 'css')).filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(cssFile, 'utf8');
  for (const m of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (/^https?:/.test(m[1])) fail(`External resource in ${relative(dist, cssFile)}: ${m[1]}`);
    else if (!existsSync(join(dirname(cssFile), m[1]))) fail(`Broken url() in ${relative(dist, cssFile)}: ${m[1]}`);
  }
}

// b) No inline scripts, inline styles or inline event handlers (the CSP would block them anyway)
if (/<script(?![^>]*\ssrc=)[^>]*>/i.test(html)) fail('Inline <script> found');
if (/\sstyle="/i.test(html)) fail('Inline style="" found');
if (/\son[a-z]+="/i.test(html)) fail('Inline event handler (onclick=…) found');

// c) target=_blank must not leak window.opener
for (const m of html.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)) {
  if (!/rel="[^"]*noopener/.test(m[0])) fail(`target=_blank without rel=noopener: ${m[0]}`);
}

// d) No dangerous DOM sinks in our JS
for (const jsFile of walk(join(dist, 'js'))) {
  const js = readFileSync(jsFile, 'utf8');
  for (const sink of ['.innerHTML', '.outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function']) {
    if (js.includes(sink)) fail(`Dangerous sink "${sink}" in ${relative(dist, jsFile)}`);
  }
}

// e) CSP present and strict
const csp = (html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/) || [])[1] || '';
if (!csp) fail('Content-Security-Policy <meta> missing');
if (/unsafe-inline|unsafe-eval|\*/.test(csp)) fail('CSP contains unsafe-inline, unsafe-eval or a wildcard');

/* ---------- 4. Report ---------- */
if (errors.length) {
  console.error('\nBuild FAILED:\n' + errors.map((e) => '  ✗ ' + e).join('\n') + '\n');
  rmSync(dist, { recursive: true, force: true });
  process.exit(1);
}

const files = walk(dist);
const kb = files.reduce((sum, f) => sum + statSync(f).size, 0) / 1024;
console.log(`✓ Build OK — ${files.length} files, ${kb.toFixed(0)} KB in dist/`);
console.log('✓ Checks: references, external resources, inline code, noopener, DOM sinks, CSP');
