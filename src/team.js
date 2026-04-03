const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { PROJECT_CONFIG, LOCALSSL_CA_PUBLIC, PROJECT_DIR } = require('./utils');
const { trustCertificate: trustMac } = require('./trust/macos');
const { trustCertificate: trustWindows } = require('./trust/windows');
const { trustCertificate: trustLinux } = require('./trust/linux');
const { trustInFirefox } = require('./trust/firefox');
const { trustInChromium } = require('./trust/chromium');

function defaultConfig(hosts = []) {
  return {
    version: 1,
    hosts,
    team: []
  };
}

function sanitizePem(pem) {
  return pem.replace(/\r\n/g, '\n').trim();
}

function assertPublicCert(pem) {
  if (!pem.includes('BEGIN CERTIFICATE') || pem.includes('PRIVATE KEY')) {
    throw new Error('localssl.json may only contain public certificates.');
  }
}

async function loadTeamConfig(hosts = []) {
  if (!(await fs.pathExists(PROJECT_CONFIG))) {
    const cfg = defaultConfig(hosts);
    await fs.writeJson(PROJECT_CONFIG, cfg, { spaces: 2 });
    return cfg;
  }

  const cfg = await fs.readJson(PROJECT_CONFIG);
  cfg.version = cfg.version || 1;
  cfg.hosts = Array.isArray(cfg.hosts) ? cfg.hosts : hosts;
  cfg.team = Array.isArray(cfg.team) ? cfg.team : [];
  return cfg;
}

async function saveTeamConfig(config) {
  for (const entry of config.team || []) {
    assertPublicCert(entry.caPubCert || '');
  }

  await fs.writeJson(PROJECT_CONFIG, config, { spaces: 2 });
}

async function syncCurrentMachine(hosts) {
  const config = await loadTeamConfig(hosts);
  const caPubCert = sanitizePem(await fs.readFile(LOCALSSL_CA_PUBLIC, 'utf8'));
  assertPublicCert(caPubCert);

  const machine = os.hostname();
  const existing = config.team.find((m) => m.machine === machine);
  const payload = {
    machine,
    os: process.platform,
    caPubCert,
    addedAt: new Date().toISOString().slice(0, 10)
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    config.team.push(payload);
  }

  config.hosts = [...new Set([...(config.hosts || []), ...hosts])];
  await saveTeamConfig(config);

  return config;
}

async function trustTeamCertificates(config) {
  let trusted = 0;

  for (const member of config.team || []) {
    if (!member.caPubCert || member.machine === os.hostname()) {
      continue;
    }

    assertPublicCert(member.caPubCert);
    const tempPath = path.join(PROJECT_DIR, '.localssl', `${member.machine}.crt`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeFile(tempPath, `${member.caPubCert}\n`);

    try {
      if (process.platform === 'darwin') await trustMac(tempPath);
      else if (process.platform === 'win32') await trustWindows(tempPath);
      else await trustLinux(tempPath);

      await trustInFirefox(tempPath);
      await trustInChromium(tempPath);
      trusted += 1;
    } catch {
      // best-effort trust for teammate certs
    }
  }

  return trusted;
}

module.exports = {
  syncCurrentMachine,
  trustTeamCertificates,
  loadTeamConfig
};
