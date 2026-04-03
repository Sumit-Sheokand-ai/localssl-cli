const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR } = require('./utils');

async function ensureGitignore() {
  const gitignorePath = path.join(PROJECT_DIR, '.gitignore');
  const required = ['.localssl/*.pem', '.localssl/*.key', '.localssl/key.pem'];

  let current = '';
  if (await fs.pathExists(gitignorePath)) {
    current = await fs.readFile(gitignorePath, 'utf8');
  }

  let updated = current;
  let changed = false;
  for (const item of required) {
    if (!updated.includes(item)) {
      updated += `${updated.endsWith('\n') || !updated ? '' : '\n'}${item}\n`;
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(gitignorePath, updated);
  }

  return changed;
}

module.exports = { ensureGitignore };
