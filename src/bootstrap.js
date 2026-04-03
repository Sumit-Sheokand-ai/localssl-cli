const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const https = require('https');
const { execFile } = require('child_process');
const { LOCALSSL_HOME, LOCALSSL_CA_PUBLIC, step, warn } = require('./utils');
const { trustCertificate: trustMac } = require('./trust/macos');
const { trustCertificate: trustWindows } = require('./trust/windows');
const { trustCertificate: trustLinux } = require('./trust/linux');
const { trustInFirefox } = require('./trust/firefox');
const { trustInChromium } = require('./trust/chromium');

const MKCERT_VERSION = 'v1.4.4';

function getMkcertBinaryPath() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  return path.join(LOCALSSL_HOME, `mkcert${ext}`);
}

function getMkcertAssetName() {
  const platform = process.platform;
  const arch = os.arch();

  if (platform === 'win32') {
    if (arch === 'x64') return 'mkcert-v1.4.4-windows-amd64.exe';
    if (arch === 'arm64') return 'mkcert-v1.4.4-windows-arm64.exe';
  }

  if (platform === 'darwin') {
    if (arch === 'x64') return 'mkcert-v1.4.4-darwin-amd64';
    if (arch === 'arm64') return 'mkcert-v1.4.4-darwin-arm64';
  }

  if (platform === 'linux') {
    if (arch === 'x64') return 'mkcert-v1.4.4-linux-amd64';
    if (arch === 'arm64') return 'mkcert-v1.4.4-linux-arm64';
  }

  throw new Error(`Unsupported platform/arch: ${platform}/${arch}`);
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`mkcert download failed: ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(outputPath, { mode: 0o755 });
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    });

    request.on('error', reject);
  });
}

async function ensureMkcert() {
  await fs.ensureDir(LOCALSSL_HOME);
  const mkcertPath = getMkcertBinaryPath();

  if (await fs.pathExists(mkcertPath)) {
    return mkcertPath;
  }

  const asset = getMkcertAssetName();
  const url = `https://github.com/FiloSottile/mkcert/releases/download/${MKCERT_VERSION}/${asset}`;
  await downloadFile(url, mkcertPath);

  if (process.platform !== 'win32') {
    await fs.chmod(mkcertPath, 0o755);
  }

  return mkcertPath;
}

function execMkcert(mkcertPath, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    execFile(mkcertPath, args, { env: { ...process.env, CAROOT: LOCALSSL_HOME, ...extraEnv } }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

async function trustSystem(certPath) {
  if (process.platform === 'darwin') {
    await trustMac(certPath);
    return 'macOS system store';
  }

  if (process.platform === 'win32') {
    const scope = await trustWindows(certPath);
    return scope;
  }

  await trustLinux(certPath);
  return 'Linux system store';
}

async function configureNodeExtraCACerts() {
  const value = LOCALSSL_CA_PUBLIC;

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      execFile('setx', ['NODE_EXTRA_CA_CERTS', value], { windowsHide: true }, () => resolve('setx NODE_EXTRA_CA_CERTS')); 
    });
  }

  const shellProfile = process.platform === 'darwin' ? path.join(os.homedir(), '.zprofile') : path.join(os.homedir(), '.profile');
  const exportLine = `export NODE_EXTRA_CA_CERTS=\"${value}\"`;

  let current = '';
  if (await fs.pathExists(shellProfile)) {
    current = await fs.readFile(shellProfile, 'utf8');
  }

  if (!current.includes('NODE_EXTRA_CA_CERTS')) {
    await fs.appendFile(shellProfile, `\n${exportLine}\n`);
    return `updated ${path.basename(shellProfile)}`;
  }

  return `${path.basename(shellProfile)} already configured`;
}

async function initMachine({ quiet = false } = {}) {
  await fs.ensureDir(LOCALSSL_HOME);
  const mkcertPath = await ensureMkcert();

  const hasCA = await fs.pathExists(LOCALSSL_CA_PUBLIC);
  if (hasCA) {
    let repairSummary = 'already configured';
    try {
      const systemResult = await trustSystem(LOCALSSL_CA_PUBLIC);
      const firefoxResult = await trustInFirefox(LOCALSSL_CA_PUBLIC);
      const chromiumResult = await trustInChromium(LOCALSSL_CA_PUBLIC);
      const nodeResult = await configureNodeExtraCACerts();
      repairSummary = `${systemResult}; ${nodeResult}; Firefox ${firefoxResult.trusted ? 'ok' : 'skipped'}; Chrome/Edge ${chromiumResult.trusted ? 'ok' : 'skipped'}`;
    } catch (error) {
      if (!quiet) {
        warn(`Trust repair skipped: ${error.message}`);
      }
    }

    if (!quiet) {
      step(1, 1, 'Machine CA setup', 'skip', `(${repairSummary})`);
    }
    return { mkcertPath, initialized: false };
  }

  try {
    await execMkcert(mkcertPath, ['-install'], { TRUST_STORES: 'system,nss' });
  } catch (error) {
    const message = error.message || '';
    const javaTrustError = /keytool|cacerts|access is denied/i.test(message);
    if (!javaTrustError) {
      throw error;
    }
    warn('Java trust store update skipped (no admin access). System/browser trust still configured.');
  }
  const systemResult = await trustSystem(LOCALSSL_CA_PUBLIC);
  const firefoxResult = await trustInFirefox(LOCALSSL_CA_PUBLIC);
  const chromiumResult = await trustInChromium(LOCALSSL_CA_PUBLIC);
  const nodeResult = await configureNodeExtraCACerts();

  if (!quiet) {
    const firefoxText = firefoxResult.trusted ? `+ Firefox (${firefoxResult.reason})` : `+ Firefox skipped (${firefoxResult.reason})`;
    const chromiumText = chromiumResult.trusted ? `+ Chrome/Edge (${chromiumResult.reason})` : `+ Chrome/Edge skipped (${chromiumResult.reason})`;
    step(1, 1, 'Installing local CA', 'ok', `(${systemResult} ${firefoxText} ${chromiumText}; ${nodeResult})`);
  }

  if (!firefoxResult.trusted) {
    warn(`Firefox trust skipped: ${firefoxResult.reason}`);
  }

  if (!chromiumResult.trusted) {
    warn(`Chrome/Edge NSS trust skipped: ${chromiumResult.reason}`);
  }

  return { mkcertPath, initialized: true };
}

module.exports = {
  initMachine,
  ensureMkcert,
  execMkcert,
  getMkcertBinaryPath
};
