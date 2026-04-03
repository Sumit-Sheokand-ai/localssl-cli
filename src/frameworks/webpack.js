const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR } = require('../utils');

async function configureWebpack(certPath, keyPath) {
  const configPath = path.join(PROJECT_DIR, 'webpack.config.js');
  if (!(await fs.pathExists(configPath))) {
    return { updated: false, details: 'webpack.config.js not found' };
  }

  const existing = await fs.readFile(configPath, 'utf8');
  if (/devServer\s*:\s*{[\s\S]*https\s*:/m.test(existing)) {
    return { updated: false, details: 'already configured' };
  }

  const injection = `\nconst fs = require('fs');\n`;
  const httpsBlock = `https: { cert: fs.readFileSync('${certPath.replace(/\\/g, '/')}'), key: fs.readFileSync('${keyPath.replace(/\\/g, '/')}') },`;

  let updated = existing;
  if (!updated.includes("const fs = require('fs');")) {
    updated = `${injection}${updated}`;
  }

  updated = updated.replace(/devServer\s*:\s*{/, `devServer: {\n    ${httpsBlock}`);
  await fs.writeFile(configPath, updated);

  return { updated: true, details: 'webpack.config.js updated' };
}

module.exports = { configureWebpack };
