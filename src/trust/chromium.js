const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { execFile } = require('child_process');

function hasCertUtil() {
  return new Promise((resolve) => {
    execFile('certutil', ['-H'], (error) => resolve(!error));
  });
}

async function getProfileRoots() {
  const home = os.homedir();

  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || '';
    return [
      path.join(local, 'Google', 'Chrome', 'User Data'),
      path.join(local, 'Microsoft', 'Edge', 'User Data')
    ];
  }

  if (process.platform === 'darwin') {
    return [
      path.join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
      path.join(home, 'Library', 'Application Support', 'Microsoft Edge')
    ];
  }

  return [
    path.join(home, '.config', 'google-chrome'),
    path.join(home, '.config', 'chromium'),
    path.join(home, '.config', 'microsoft-edge')
  ];
}

async function collectNssDatabases() {
  const dbs = new Set();
  const home = os.homedir();

  const commonDb = path.join(home, '.pki', 'nssdb');
  if (await fs.pathExists(path.join(commonDb, 'cert9.db'))) {
    dbs.add(commonDb);
  }

  const roots = await getProfileRoots();
  for (const root of roots) {
    if (!(await fs.pathExists(root))) {
      continue;
    }

    const entries = await fs.readdir(root).catch(() => []);
    for (const entry of entries) {
      if (entry !== 'Default' && !entry.startsWith('Profile ')) {
        continue;
      }

      const profile = path.join(root, entry);
      if (await fs.pathExists(path.join(profile, 'cert9.db'))) {
        dbs.add(profile);
      }
    }
  }

  return [...dbs];
}

async function runCertUtil(args) {
  return new Promise((resolve) => {
    execFile('certutil', args, () => resolve());
  });
}

async function trustInChromium(certPath) {
  const available = await hasCertUtil();
  if (!available) {
    return { trusted: false, reason: 'certutil not found' };
  }

  const databases = await collectNssDatabases();
  if (!databases.length) {
    return { trusted: false, reason: 'no Chrome/Edge NSS DB found' };
  }

  let applied = 0;
  for (const db of databases) {
    await runCertUtil(['-A', '-n', 'localssl', '-t', 'C,,', '-i', certPath, '-d', `sql:${db}`]);
    applied += 1;
  }

  return { trusted: true, reason: `${applied} NSS DB(s)` };
}

async function untrustInChromium() {
  const available = await hasCertUtil();
  if (!available) {
    return;
  }

  const databases = await collectNssDatabases();
  for (const db of databases) {
    await runCertUtil(['-D', '-n', 'localssl', '-d', `sql:${db}`]);
  }
}

module.exports = { trustInChromium, untrustInChromium };
