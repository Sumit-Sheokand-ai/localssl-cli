const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR, PROJECT_LOCALSSL_DIR, PROJECT_CERT, PROJECT_KEY } = require('./utils');
const { execMkcert } = require('./bootstrap');

function parseHostsFromUrl(value) {
  try {
    const normalized = value.startsWith('http') ? value : `https://${value}`;
    const host = new URL(normalized).hostname;
    return host ? [host] : [];
  } catch {
    return [];
  }
}

async function detectHostsFromProject() {
  const hosts = new Set(['localhost', '127.0.0.1', '::1']);

  const packageJsonPath = path.join(PROJECT_DIR, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const pkg = await fs.readJson(packageJsonPath).catch(() => ({}));
    if (typeof pkg.proxy === 'string') {
      parseHostsFromUrl(pkg.proxy).forEach((host) => hosts.add(host));
    }
  }

  for (const file of ['.env', '.env.local']) {
    const envPath = path.join(PROJECT_DIR, file);
    if (!(await fs.pathExists(envPath))) {
      continue;
    }

    const content = await fs.readFile(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const [key, raw] = line.split('=');
      if (!key || !raw) {
        continue;
      }

      const value = raw.trim().replace(/^['"]|['"]$/g, '');
      if (/VITE_DEV_SERVER_HOST|NEXT_PUBLIC_URL|APP_URL|HOST|DEV_URL/i.test(key)) {
        parseHostsFromUrl(value).forEach((host) => hosts.add(host));
      }
    }
  }

  return [...hosts];
}

async function generateProjectCert({ mkcertPath, hosts, force = false }) {
  await fs.ensureDir(PROJECT_LOCALSSL_DIR);

  const certExists = (await fs.pathExists(PROJECT_CERT)) && (await fs.pathExists(PROJECT_KEY));
  if (certExists && !force) {
    return { generated: false, certPath: PROJECT_CERT, keyPath: PROJECT_KEY };
  }

  await execMkcert(mkcertPath, ['-cert-file', PROJECT_CERT, '-key-file', PROJECT_KEY, ...hosts]);
  return { generated: true, certPath: PROJECT_CERT, keyPath: PROJECT_KEY };
}

module.exports = {
  detectHostsFromProject,
  generateProjectCert
};
