const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR } = require('../utils');

async function detectFramework() {
  const packageJsonPath = path.join(PROJECT_DIR, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    return 'generic';
  }

  const pkg = await fs.readJson(packageJsonPath).catch(() => ({}));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps.vite) return 'vite';
  if (deps.next) return 'nextjs';
  if (deps['react-scripts']) return 'cra';
  if (deps.express) return 'express';
  if (deps['webpack-dev-server']) return 'webpack';

  return 'generic';
}

module.exports = { detectFramework };
