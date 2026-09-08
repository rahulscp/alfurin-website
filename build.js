/**
 * AlsysLife i18n build script
 * Usage:
 *   node build.js         Build every language listed in locales/languages.json
 *   node build.js de      Build only that one language (e.g. for the German bucket)
 *
 * Reads templates/ + locales/<lang>.json and writes a fully self-contained
 * site build for the requested language(s) into dist/<lang>/ (html plus
 * its own copy of css/js/images).
 *
 * Each dist/<lang>/ folder is meant to be deployed as the ROOT of its
 * own bucket/domain, so all asset paths inside it are root-relative —
 * build one language at a time and ship that single dist/<lang>/ folder
 * to that language's bucket.
 *
 * Language switcher / hreflang links use each language's "domain" from
 * locales/languages.json when set. Until real domains are filled in,
 * links fall back to relative sibling paths (../<lang>/<file>) so the
 * separate builds can still be previewed and cross-navigated locally
 * from dist/.
 *
 * A language entry can set "locale" to reuse another language's
 * translation file instead of its own (e.g. "ch" with "locale": "de"
 * builds German content into dist/ch/ for a Swiss domain, staying in
 * sync with de.json automatically on every rebuild).
 */

const fs   = require('fs');
const path = require('path');

// ── Site config ───────────────────────────────────────────────────────────────
const OUT_DIR = 'dist';

const PAGES = [
  { name: 'index',           bodyClass: 'theme-alfurin' },
  { name: 'about',           bodyClass: ''              },
  { name: 'contact',         bodyClass: 'theme-alfurin' },
  { name: 'psoriasis',       bodyClass: 'theme-alfurin' },
  { name: 'pipeline',        bodyClass: ''              },
  { name: 'clinical-trials', bodyClass: ''              },
  { name: 'research',        bodyClass: ''              },
  { name: 'science',         bodyClass: 'theme-alfurin' },
];

const STATIC_DIRS  = ['css', 'js', 'images'];
const STATIC_FILES = ['logo.png', 'ALFURIN_Patient_Flyer_EN.pdf', 'ALFURIN_Skin_Compatibility_Report.pdf'];

// ── Load language config + translation files ─────────────────────────────────
const languages = JSON.parse(fs.readFileSync('locales/languages.json', 'utf8'));
const langKeys  = Object.keys(languages);

// A language entry may set "locale" to reuse another language's translation
// file verbatim (e.g. "ch" reusing "de.json" for a German-content .ch build)
// instead of maintaining a duplicate translation file that can drift.
const locales = {};
for (const lang of langKeys) {
  const sourceLang = languages[lang].locale || lang;
  locales[lang] = JSON.parse(fs.readFileSync(`locales/${sourceLang}.json`, 'utf8'));
}

// ── Which language(s) to build this run ───────────────────────────────────────
const requestedLang = process.argv[2];
if (requestedLang && !langKeys.includes(requestedLang)) {
  console.error(`Unknown language "${requestedLang}". Available: ${langKeys.join(', ')}`);
  process.exit(1);
}
const buildLangs = requestedLang ? [requestedLang] : langKeys;

// ── Helpers ───────────────────────────────────────────────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function trimSlash(url) {
  return url.replace(/\/$/, '');
}

// URL to `file` in `targetLang`'s build — absolute once a domain is set,
// relative sibling path (for local dist/ preview) otherwise.
function langUrl(targetLang, file) {
  const domain = languages[targetLang].domain;
  return domain ? `${trimSlash(domain)}/${file}` : `../${targetLang}/${file}`;
}

// Quick nav toggle: "<CODE> | EN" on every non-English build, linking to a
// same-domain /en subfolder (a nested copy of the English build baked into
// every other language's output — see the "en" nesting step in the main
// build loop below) rather than jumping to a different domain.
//
// The standalone English build (dist/en/) just shows "EN" — it's the hub
// every other language points back to, so it needs no toggle of its own
// (the full cross-domain list lives in the footer via buildFooterLanguages).
//
// But the English copy NESTED inside another language's folder (dist/nl/en/)
// isn't that hub — it needs its own way back to the specific language it's
// nested in. `nestedBack` carries that: { code, prefix } for the parent
// language's code and the relative path prefix to reach it (one dir up).
function buildLangSwitcher(activeLang, file, nestedBack) {
  const code = languages[activeLang].code;

  if (activeLang === 'en' && !nestedBack) {
    return `      <li class="lang-switcher"><span class="lang-active">${code}</span></li>`;
  }

  const backCode = nestedBack ? nestedBack.code : 'EN';
  const backHref = nestedBack ? `${nestedBack.prefix}${file}` : `/en/${file}`;

  return [
    `      <li class="lang-switcher">`,
    `        <span class="lang-active">${code}</span>`,
    `        <span class="lang-sep">|</span>`,
    `        <a href="${backHref}" class="lang-switch">${backCode}</a>`,
    `      </li>`,
  ].join('\n');
}

// Inline data for main.js's counterfeit-disclaimer modal — main.js is a
// shared static file copied verbatim into every dist/<lang>/, so it can't
// hold per-language text itself; this feeds it via a global set just before
// main.js loads.
function buildDisclaimerData(t) {
  const data = {
    title: t['disclaimer.title'],
    body:  t['disclaimer.body'],
    chips: [t['disclaimer.chip1'], t['disclaimer.chip2'], t['disclaimer.chip3']],
    note:  t['disclaimer.note'],
    btn:   t['disclaimer.btn'],
    close: t['disclaimer.close'],
  };
  return `<script>window.__DISCLAIMER__=${JSON.stringify(data)};</script>`;
}

// Only languages with a real "domain" are shown — a language build can
// exist in dist/ without being a live site yet, and shouldn't appear as
// a clickable link until it actually has somewhere to send people.
function buildFooterLanguages(activeLang, file, labelText) {
  const liveLangs = langKeys.filter(lang => languages[lang].domain);

  const links = liveLangs.map(lang => {
    const cls = lang === activeLang ? 'footer-lang-link active' : 'footer-lang-link';
    return `      <a href="${langUrl(lang, file)}" class="${cls}">${languages[lang].label}</a>`;
  }).join('\n');

  return [
    `    <div class="footer-languages">`,
    `      <span class="footer-lang-label">${labelText}</span>`,
    links,
    `    </div>`,
  ].join('\n');
}

// hreflang / canonical tags only make sense once real domains exist —
// omitted (rather than pointing at placeholder relative URLs) until then.
function hreflangBlock(file) {
  const withDomain = langKeys.filter(l => languages[l].domain);
  if (!withDomain.length) return '';

  const lines = withDomain.map(l =>
    `  <link rel="alternate" hreflang="${l}" href="${trimSlash(languages[l].domain)}/${file}">`
  );
  const defaultLang = languages.en && languages.en.domain ? 'en' : withDomain[0];
  lines.push(`  <link rel="alternate" hreflang="x-default" href="${trimSlash(languages[defaultLang].domain)}/${file}">`);
  return lines.join('\n');
}

function canonicalTag(lang, file) {
  const domain = languages[lang].domain;
  return domain ? `  <link rel="canonical" href="${trimSlash(domain)}/${file}">` : '';
}

// ── Build one page for one language ───────────────────────────────────────────
function buildPage(page, lang, nestedBack) {
  const file = page.name + '.html';
  let html   = fs.readFileSync(path.join('templates', file), 'utf8');

  const bodyAttr = page.bodyClass ? ` class="${page.bodyClass}"` : '';
  const t        = locales[lang];
  const hreflang = [canonicalTag(lang, file), hreflangBlock(file)].filter(Boolean).join('\n');

  // Built-in tokens
  html = html.split('{{ASSET_PREFIX}}').join('');
  html = html.split('{{HREFLANG}}').join(hreflang);
  html = html.split('{{lang}}').join(lang);
  html = html.split('{{BODY_CLASS_ATTR}}').join(bodyAttr);
  html = html.split('{{LANG_SWITCHER}}').join(buildLangSwitcher(lang, file, nestedBack));
  html = html.split('{{FOOTER_LANGUAGES}}').join(buildFooterLanguages(lang, file, t['footer.languages.label'] || 'Language'));
  html = html.split('{{DISCLAIMER_DATA}}').join(buildDisclaimerData(t));

  // Translation strings — sort longest key first to avoid partial substitution
  const keys = Object.keys(t).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    html = html.split(`{{${key}}}`).join(t[key] ?? '');
  }

  return html;
}

// Writes one language's pages + static assets into outDir, fully self-contained.
function writeLanguageBuild(lang, outDir, label, nestedBack) {
  fs.mkdirSync(outDir, { recursive: true });

  for (const dir of STATIC_DIRS) {
    if (fs.existsSync(dir)) copyDir(dir, path.join(outDir, dir));
  }
  for (const file of STATIC_FILES) {
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join(outDir, file));
  }

  for (const page of PAGES) {
    const out = buildPage(page, lang, nestedBack);
    fs.writeFileSync(path.join(outDir, page.name + '.html'), out, 'utf8');
    console.log(`✓ ${label}/${page.name}.html`);
  }
}

// ── Build one full, self-contained language site ──────────────────────────────
for (const lang of buildLangs) {
  const outDir = path.join(OUT_DIR, lang);
  writeLanguageBuild(lang, outDir, `${OUT_DIR}/${lang}`);

  // Nest a same-domain /en copy so the nav's quick "EN" toggle never has to
  // jump to a different domain — it always resolves to a local /en subfolder
  // that ships inside every non-English bucket. That nested copy gets its
  // own way back to this specific language (not the generic "EN" hub logic),
  // so switching to English and back again stays inside the same bucket.
  if (lang !== 'en') {
    const enDir = path.join(outDir, 'en');
    const nestedBack = { code: languages[lang].code, prefix: '../' };
    writeLanguageBuild('en', enDir, `${OUT_DIR}/${lang}/en`, nestedBack);
  }
}

console.log(`\nBuild complete — ${buildLangs.length} language build(s) in ${OUT_DIR}/ (${PAGES.length} pages each).`);
console.log(`Each ${OUT_DIR}/<lang>/ folder is self-contained — deploy it as the root of its own bucket/domain.`);
