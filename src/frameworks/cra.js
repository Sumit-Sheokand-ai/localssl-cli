const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR } = require('../utils');

async function configureCra(certPath, keyPath) {
  const envLocalPath = path.join(PROJECT_DIR, '.env.local');
  const vars = {
    HTTPS: 'true',
    SSL_CRT_FILE: certPath,
    SSL_KEY_FILE: keyPath
  };

  let current = '';
  if (await fs.pathExists(envLocalPath)) {
    current = await fs.readFile(envLocalPath, 'utf8');
  }

  let changed = false;
  let updated = current;
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}=${value}`;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(updated)) {
      if (!updated.includes(line)) {
        updated = updated.replace(regex, line);
        changed = true;
      }
    } else {
      updated += `${updated.endsWith('\n') || !updated ? '' : '\n'}${line}\n`;
      changed = true;
    }
  }

  if (!changed) {
    return { updated: false, details: 'already configured' };
  }

  await fs.writeFile(envLocalPath, updated);
  return { updated: true, details: '.env.local updated' };
}

module.exports = { configureCra };
