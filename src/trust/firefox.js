const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { execFile } = require('child_process');

function getFirefoxProfilesDir() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'Mozilla', 'Firefox', 'Profiles');
  }

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Firefox', 'Profiles');
  }

  return path.join(home, '.mozilla', 'firefox');
}

async function hasCertUtil() {
  return new Promise((resolve) => {
    execFile('certutil', ['-H'], (error) => resolve(!error));
  });
}

async function listProfiles() {
  const dir = getFirefoxProfilesDir();
  if (!(await fs.pathExists(dir))) {
    return [];
  }

  const entries = await fs.readdir(dir);
  return entries.map((entry) => path.join(dir, entry));
}

async function trustInFirefox(certPath) {
  const available = await hasCertUtil();
  if (!available) {
    return { trusted: false, reason: 'certutil not found' };
  }

  const profiles = await listProfiles();
  if (!profiles.length) {
    return { trusted: false, reason: 'Firefox not found' };
  }

  for (const profile of profiles) {
    await new Promise((resolve) => {
      execFile('certutil', ['-A', '-n', 'localssl', '-t', 'C,,', '-i', certPath, '-d', `sql:${profile}`], () => resolve());
    });
  }

  return { trusted: true, reason: `${profiles.length} profile(s)` };
}

async function untrustInFirefox() {
  const available = await hasCertUtil();
  if (!available) {
    return;
  }

  const profiles = await listProfiles();
  for (const profile of profiles) {
    await new Promise((resolve) => {
      execFile('certutil', ['-D', '-n', 'localssl', '-d', `sql:${profile}`], () => resolve());
    });
  }
}

module.exports = { trustInFirefox, untrustInFirefox };
