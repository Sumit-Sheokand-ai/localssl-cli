const path = require('path');
const fs = require('fs-extra');
const { LOCALSSL_HOME, LOCALSSL_CA_PUBLIC, PROJECT_LOCALSSL_DIR, PROJECT_DIR } = require('./utils');
const { untrustCertificate: untrustMac } = require('./trust/macos');
const { untrustCertificate: untrustWindows } = require('./trust/windows');
const { untrustCertificate: untrustLinux } = require('./trust/linux');
const { untrustInFirefox } = require('./trust/firefox');
const { untrustInChromium } = require('./trust/chromium');

async function removeTrust() {
  if (process.platform === 'darwin') await untrustMac(LOCALSSL_CA_PUBLIC);
  else if (process.platform === 'win32') await untrustWindows(LOCALSSL_CA_PUBLIC);
  else await untrustLinux();

  await untrustInFirefox();
  await untrustInChromium();
}

async function cleanupFrameworkArtifacts() {
  const helper = path.join(PROJECT_DIR, 'localssl.js');
  if (await fs.pathExists(helper)) {
    await fs.remove(helper);
  }
}

async function removeAll() {
  await removeTrust().catch(() => {});
  await fs.remove(LOCALSSL_HOME).catch(() => {});
  await fs.remove(PROJECT_LOCALSSL_DIR).catch(() => {});
  await cleanupFrameworkArtifacts();
  console.log('  localssl removed ✓');
}

module.exports = { removeAll };
