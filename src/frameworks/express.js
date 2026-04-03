const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR } = require('../utils');

async function configureExpress(certPath, keyPath) {
  const helperPath = path.join(PROJECT_DIR, 'localssl.js');
  if (await fs.pathExists(helperPath)) {
    return { updated: false, details: 'localssl.js already exists' };
  }

  const content = `const fs = require('fs');\n\nconst httpsOptions = {\n  cert: fs.readFileSync('${certPath.replace(/\\/g, '/')}'),\n  key: fs.readFileSync('${keyPath.replace(/\\/g, '/')}')\n};\n\nmodule.exports = { httpsOptions };\n`;

  await fs.writeFile(helperPath, content);
  return { updated: true, details: 'localssl.js created' };
}

module.exports = { configureExpress };
