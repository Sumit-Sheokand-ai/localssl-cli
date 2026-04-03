const { execFile } = require('child_process');

function trustCertificate(certPath) {
  return new Promise((resolve, reject) => {
    execFile('certutil', ['-addstore', '-f', 'ROOT', certPath], { windowsHide: true }, (error) => {
      if (error) {
        reject(new Error('Admin privileges required to install CA on Windows. Re-run terminal as Administrator.'));
        return;
      }
      resolve();
    });
  });
}

function untrustCertificate(certPath) {
  return new Promise((resolve) => {
    execFile('certutil', ['-delstore', 'ROOT', certPath], { windowsHide: true }, () => resolve());
  });
}

module.exports = { trustCertificate, untrustCertificate };
