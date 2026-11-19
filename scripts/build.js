'use strict';
/**
 * npm run build
 *  1. Syntax-checks every .js file (node --check)
 *  2. Copies src/, public/, db/ and package files into dist/
 *  3. Creates a deployable archive (tar.gz, falling back to zip) inside dist/
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const pkg = require(path.join(root, 'package.json'));

// ---- 1. Syntax check --------------------------------------------------------
function collectJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJsFiles(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

console.log('Checking syntax...');
const files = ['src', 'public', 'scripts'].flatMap((d) => collectJsFiles(path.join(root, d)));
let failed = false;
for (const file of files) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) {
    failed = true;
    console.error(`  FAIL ${path.relative(root, file)}\n${r.stderr}`);
  }
}
if (failed) {
  console.error('Build aborted: syntax errors found.');
  process.exit(1);
}
console.log(`  ${files.length} files OK`);

// ---- 2. Copy into dist/ -----------------------------------------------------
console.log('Copying files to dist/ ...');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const skipDbFiles = (src) => !/\.db(-shm|-wal)?$/.test(src); // never ship a local database
for (const dir of ['src', 'public', 'db']) {
  fs.cpSync(path.join(root, dir), path.join(dist, dir), { recursive: true, filter: skipDbFiles });
}
for (const file of ['package.json', 'package-lock.json', '.env.example', 'README.md']) {
  const from = path.join(root, file);
  if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dist, file));
}

// ---- 3. Archive -------------------------------------------------------------
// Archive is built in a temp dir first so it does not include itself.
const baseName = `${pkg.name}-${pkg.version}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'expense-build-'));

function tryArchive() {
  const tgz = path.join(tmpDir, `${baseName}.tar.gz`);
  let r = spawnSync('tar', ['-czf', tgz, '-C', dist, '.'], { encoding: 'utf8' });
  if (r.status === 0) return tgz;

  const zip = path.join(tmpDir, `${baseName}.zip`);
  r = spawnSync('zip', ['-qr', zip, '.'], { cwd: dist, encoding: 'utf8' });
  if (r.status === 0) return zip;

  return null;
}

const archive = tryArchive();
if (!archive) {
  console.error('Could not create archive: neither "tar" nor "zip" is available.');
  process.exit(1);
}
const finalPath = path.join(dist, path.basename(archive));
fs.copyFileSync(archive, finalPath);
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`Build complete: ${path.relative(root, finalPath)}`);
console.log('Deploy: extract, run "npm ci --omit=dev", then "npm start".');
