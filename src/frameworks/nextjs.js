const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR } = require('../utils');

function ensureHttpsFlag(script, certPath, keyPath) {
  if (!script || script.includes('--experimental-https')) {
    return script;
  }

  const cert = certPath.replace(/\\/g, '/');
  const key = keyPath.replace(/\\/g, '/');
  return `${script} --experimental-https --experimental-https-key ${key} --experimental-https-cert ${cert}`;
}

async function configureNext(certPath, keyPath) {
  const packageJsonPath = path.join(PROJECT_DIR, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    return { updated: false, details: 'package.json not found' };
  }

  const pkg = await fs.readJson(packageJsonPath);
  pkg.scripts = pkg.scripts || {};
  const before = pkg.scripts.dev || 'next dev';
  const nextScript = ensureHttpsFlag(before, certPath, keyPath);

  if (nextScript === before) {
    return { updated: false, details: 'already configured' };
  }

  pkg.scripts.dev = nextScript;
  await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
  return { updated: true, details: 'package.json scripts updated' };
}

module.exports = { configureNext };
