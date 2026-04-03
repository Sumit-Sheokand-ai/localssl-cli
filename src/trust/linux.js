const { execFile } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const systemCertPath = '/usr/local/share/ca-certificates/localssl-ca.crt';

async function trustCertificate(certPath) {
  await fs.copy(certPath, systemCertPath);
  await new Promise((resolve, reject) => {
    execFile('update-ca-certificates', [], (error) => {
      if (error) {
        reject(new Error('Linux trust update failed. Install ca-certificates tools and re-run with sudo.'));
        return;
      }
      resolve();
    });
  });
}

async function untrustCertificate() {
  if (await fs.pathExists(systemCertPath)) {
    await fs.remove(systemCertPath);
  }

  await new Promise((resolve) => {
    execFile('update-ca-certificates', ['--fresh'], () => resolve());
  });
}

module.exports = { trustCertificate, untrustCertificate, systemCertPath };
