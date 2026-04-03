const fs = require('fs');
const path = require('path');

function getHttpsOptions(baseDir = process.cwd()) {
  const certPath = path.join(baseDir, '.localssl', 'cert.pem');
  const keyPath = path.join(baseDir, '.localssl', 'key.pem');

  return {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };
}

module.exports = {
  getHttpsOptions
};
