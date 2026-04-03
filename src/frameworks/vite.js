const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR } = require('../utils');

async function configureVite(certPath, keyPath) {
  const tsPath = path.join(PROJECT_DIR, 'vite.config.ts');
  const jsPath = path.join(PROJECT_DIR, 'vite.config.js');
  const configPath = (await fs.pathExists(tsPath)) ? tsPath : jsPath;

  if (!configPath || !(await fs.pathExists(configPath))) {
    const content = `import { defineConfig } from 'vite';\nimport fs from 'fs';\n\nexport default defineConfig({\n  server: {\n    https: {\n      cert: fs.readFileSync('${certPath.replace(/\\/g, '/')}'),\n      key: fs.readFileSync('${keyPath.replace(/\\/g, '/')}')\n    }\n  }\n});\n`;
    await fs.writeFile(tsPath, content);
    return { updated: true, details: 'vite.config.ts created' };
  }

  const existing = await fs.readFile(configPath, 'utf8');
  if (/server\s*:\s*{[\s\S]*https\s*:/m.test(existing) || /https\s*:\s*true/m.test(existing)) {
    return { updated: false, details: 'already configured' };
  }

  const injection = `\n\n// localssl\nimport fs from 'fs';\n\nconst localsslHttps = {\n  cert: fs.readFileSync('${certPath.replace(/\\/g, '/')}'),\n  key: fs.readFileSync('${keyPath.replace(/\\/g, '/')}')\n};\n`;

  const updated = existing.replace(/defineConfig\s*\(\s*{/, `defineConfig({\n  server: { https: localsslHttps },`);
  const finalText = updated === existing ? `${existing}${injection}` : `${injection}${updated}`;
  await fs.writeFile(configPath, finalText);

  return { updated: true, details: path.basename(configPath) + ' updated' };
}

module.exports = { configureVite };
