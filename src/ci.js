const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { execFile } = require('child_process');
const { ensureMkcert } = require('./bootstrap');

function execWithEnv(file, args, env) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { env }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

async function runCiSetup() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'localssl-'));
  const certDir = path.join(tempRoot, 'certs');
  const cert = path.join(certDir, 'cert.pem');
  const key = path.join(certDir, 'key.pem');
  const ca = path.join(tempRoot, 'rootCA.pem');
  await fs.ensureDir(certDir);

  const mkcertPath = await ensureMkcert();
  const env = { ...process.env, CAROOT: tempRoot };
  await execWithEnv(mkcertPath, ['-install'], env);
  await execWithEnv(mkcertPath, ['-cert-file', cert, '-key-file', key, 'localhost', '127.0.0.1', '::1'], env);

  const vars = {
    NODE_EXTRA_CA_CERTS: ca,
    SSL_CERT_FILE: ca,
    REQUESTS_CA_BUNDLE: ca,
    LOCALSSL_CERT_FILE: cert,
    LOCALSSL_KEY_FILE: key
  };

  if (process.env.GITHUB_ENV) {
    const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    await fs.appendFile(process.env.GITHUB_ENV, lines);
  }

  console.log('  CI HTTPS ready ✓');
  for (const [k, v] of Object.entries(vars)) {
    console.log(`  export ${k}=${v}`);
  }
}

module.exports = { runCiSetup };
