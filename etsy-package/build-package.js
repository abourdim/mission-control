/**
 * Mini Mission Control — Etsy Package Builder
 * Renders printables to PNG, gathers the app + docs, and builds the ZIP.
 *
 * Usage:
 *   npm install --save-dev @playwright/test
 *   npx playwright install chromium
 *   node etsy-package/build-package.js
 *
 * Produces:
 *   etsy-package/MissionControl-v1.0.0/          (folder)
 *   etsy-package/MissionControl-v1.0.0.zip       (final ZIP)
 *   etsy-package/output/*.png                   (rendered printables + mockups)
 *
 * Mirrors noor-cast/etsy-package/build-package.js (same structure, adapted paths).
 * Seller-only files in this folder (ETSY_LISTING*, ETSY_PUBLISH_GUIDE,
 * LICENSE-SITE, SITE_LICENSE_CERTIFICATE) are NEVER copied into the ZIP.
 */

import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
import { mkdirSync, existsSync, copyFileSync, readdirSync, rmSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const VERSION = 'v1.0.0';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PKG = resolve(__dirname);
const OUT = resolve(PKG, 'output');
const ZIP_DIR = resolve(PKG, `MissionControl-${VERSION}`);

if (existsSync(ZIP_DIR)) rmSync(ZIP_DIR, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(join(ZIP_DIR, 'printables'), { recursive: true });
mkdirSync(join(ZIP_DIR, 'etsy-mockups'), { recursive: true });
mkdirSync(join(ZIP_DIR, 'assets'), { recursive: true });
mkdirSync(join(ZIP_DIR, 'docs'), { recursive: true });
mkdirSync(join(ZIP_DIR, 'js'), { recursive: true });

async function renderHTML(browser, htmlFile, outputPng, opts = {}) {
  const page = await browser.newPage({
    viewport: { width: opts.width || 794, height: opts.height || 1123 },
    deviceScaleFactor: opts.scale || 2,
  });
  await page.goto(`file://${resolve(PKG, htmlFile)}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  if (opts.fullPage) await page.screenshot({ path: outputPng, fullPage: true });
  else               await page.screenshot({ path: outputPng });
  await page.close();
  console.log(`  ✓ ${outputPng.split('/').pop()}`);
}

async function renderMockups(browser) {
  const page = await browser.newPage({
    viewport: { width: 2000, height: 1500 }, deviceScaleFactor: 1,
  });
  await page.goto(`file://${resolve(PKG, 'etsy-listing-mockups.html')}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const mockups = await page.$$('.mockup');
  for (let i = 0; i < mockups.length; i++) {
    const p = join(OUT, `etsy-mockup-${i + 1}.png`);
    await mockups[i].screenshot({ path: p });
    console.log(`  ✓ etsy-mockup-${i + 1}.png`);
  }
  await page.close();
}

async function renderPinterestPins(browser) {
  const src = resolve(PKG, 'seller-only/pinterest-pins.html');
  if (!existsSync(src)) return;
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1500 }, deviceScaleFactor: 2,
  });
  await page.goto(`file://${src}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const pins = await page.$$('.pin');
  for (let i = 0; i < pins.length; i++) {
    const p = join(OUT, `pinterest-pin-${i + 1}.png`);
    await pins[i].screenshot({ path: p });
    console.log(`  ✓ pinterest-pin-${i + 1}.png`);
  }
  await page.close();
}

function copyDir(name, destName = name) {
  const src = join(ROOT, name);
  if (!existsSync(src)) { console.log(`  ⚠️  missing: ${name}/`); return; }
  const dst = join(ZIP_DIR, destName);
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dst, entry);
    if (statSync(s).isDirectory()) {
      mkdirSync(d, { recursive: true });
      for (const sub of readdirSync(s)) copyFileSync(join(s, sub), join(d, sub));
    } else {
      copyFileSync(s, d);
    }
  }
  console.log(`  ✓ ${destName}/`);
}

async function main() {
  console.log(`\n🎮 Mini Mission Control Etsy Package Builder — ${VERSION}\n`);
  console.log('📦 Rendering printables to PNG...\n');

  const browser = await chromium.launch();

  await renderHTML(browser, 'quickstart-card.html',     join(OUT, 'quickstart-card.png'));
  await renderHTML(browser, 'shortcuts-cheatsheet.html',join(OUT, 'shortcuts-cheatsheet.png'), { width: 1123, height: 794 });
  await renderHTML(browser, 'classroom-poster.html',    join(OUT, 'classroom-poster.png'),    { width: 1123, height: 1587 });
  await renderHTML(browser, 'lesson-plan-template.html',join(OUT, 'lesson-plan-template.png'), { fullPage: true });
  await renderHTML(browser, 'sticker-sheet.html',       join(OUT, 'sticker-sheet.png'));
  await renderHTML(browser, 'README-quickstart.html',   join(OUT, 'README-quickstart.png'));

  console.log('\n🖼️  Rendering Etsy listing mockups...\n');
  await renderMockups(browser);

  console.log('\n📌 Rendering Pinterest pins (seller-only)...\n');
  await renderPinterestPins(browser);

  await browser.close();

  console.log('\n📁 Building ZIP structure...\n');

  const appFiles = [
    'index.html', 'styles.css', 'sw.js', 'manifest.json',
    'makecode.ts', 'pxt.json', 'tests.html',
    'README.md', 'SETUP.md', 'CHANGELOG.md', 'LICENSE',
  ];
  for (const f of appFiles) {
    const src = join(ROOT, f);
    if (existsSync(src)) { copyFileSync(src, join(ZIP_DIR, f)); console.log(`  ✓ ${f}`); }
    else console.log(`  ⚠️  missing: ${f}`);
  }

  copyDir('docs');
  copyDir('assets');
  copyDir('js');

  copyFileSync(join(PKG, 'LICENSE.txt'), join(ZIP_DIR, 'LICENSE.txt'));
  console.log('  ✓ LICENSE.txt');

  const printables = [
    'quickstart-card.png', 'shortcuts-cheatsheet.png',
    'classroom-poster.png', 'lesson-plan-template.png',
    'sticker-sheet.png', 'README-quickstart.png',
  ];
  for (const f of printables) {
    const src = join(OUT, f);
    if (existsSync(src)) copyFileSync(src, join(ZIP_DIR, 'printables', f));
  }
  console.log('  ✓ printables/ PNGs (6)');

  const htmlSources = [
    'quickstart-card.html', 'shortcuts-cheatsheet.html',
    'classroom-poster.html', 'lesson-plan-template.html',
    'sticker-sheet.html', 'README-quickstart.html',
  ];
  for (const f of htmlSources) {
    copyFileSync(join(PKG, f), join(ZIP_DIR, 'printables', f));
  }
  console.log('  ✓ printables/ HTML sources (6)');

  for (let i = 1; i <= 7; i++) {
    const f = `etsy-mockup-${i}.png`;
    const src = join(OUT, f);
    if (existsSync(src)) copyFileSync(src, join(ZIP_DIR, 'etsy-mockups', f));
  }
  console.log('  ✓ etsy-mockups/ (7)');

  console.log('\n📦 Creating ZIP archive...\n');
  const zipPath = join(PKG, `MissionControl-${VERSION}.zip`);
  if (existsSync(zipPath)) rmSync(zipPath);
  let zipped = false;
  try { execSync(`cd "${PKG}" && zip -r "${zipPath}" "MissionControl-${VERSION}/"`, { stdio: 'pipe' }); zipped = true; } catch {}
  if (!zipped) try { execSync(`cd "${PKG}" && ditto -c -k --keepParent "MissionControl-${VERSION}" "${zipPath}"`, { stdio: 'pipe' }); zipped = true; } catch {}
  if (!zipped) try { execSync(`powershell.exe -Command "Compress-Archive -Path '${ZIP_DIR}' -DestinationPath '${zipPath}' -Force"`, { stdio: 'pipe' }); zipped = true; } catch {}

  if (zipped) console.log(`  ✅ ${zipPath}`);
  else        console.log(`  ❌ Could not create ZIP — manually zip ${ZIP_DIR}`);

  try {
    const size = execSync(`du -sh "${zipPath}" 2>/dev/null || echo "N/A"`).toString().trim();
    console.log(`\n📊 ZIP size: ${size.split('\t')[0]}`);
  } catch {}

  console.log('\n🎉 Done!\n');
  console.log('Files:');
  console.log(`  📦 ZIP:      ${zipPath}`);
  console.log(`  📁 Folder:   ${ZIP_DIR}/`);
  console.log(`  🖼️  Mockups:  ${join(OUT, 'etsy-mockup-*.png')}`);
  console.log(`  🖨️  Prints:   ${join(OUT, '*.png')}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
