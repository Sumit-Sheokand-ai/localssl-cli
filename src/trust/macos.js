const { execFile } = require('child_process');

function trustCertificate(certPath) {
  return new Promise((resolve, reject) => {
    execFile(
      'security',
      ['add-trusted-cert', '-d', '-r', 'trustRoot', '-k', '/Library/Keychains/System.keychain', certPath],
      (error) => {
        if (error) {
          reject(new Error('Admin privileges required to install CA on macOS. Re-run with sudo.'));
          return;
        }
        resolve();
      }
    );
  });
}

function untrustCertificate(certPath) {
  return new Promise((resolve) => {
    execFile('security', ['remove-trusted-cert', '-d', certPath], () => resolve());
  });
}

module.exports = { trustCertificate, untrustCertificate };
