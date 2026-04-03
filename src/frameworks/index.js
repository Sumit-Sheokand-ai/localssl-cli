const { detectFramework } = require('./detect');
const { configureVite } = require('./vite');
const { configureNext } = require('./nextjs');
const { configureCra } = require('./cra');
const { configureExpress } = require('./express');
const { configureWebpack } = require('./webpack');

async function configureFramework(certPath, keyPath) {
  const framework = await detectFramework();

  if (framework === 'vite') {
    const result = await configureVite(certPath, keyPath);
    return { framework: 'Vite', ...result };
  }

  if (framework === 'nextjs') {
    const result = await configureNext(certPath, keyPath);
    return { framework: 'Next.js', ...result };
  }

  if (framework === 'cra') {
    const result = await configureCra(certPath, keyPath);
    return { framework: 'Create React App', ...result };
  }

  if (framework === 'express') {
    const result = await configureExpress(certPath, keyPath);
    return { framework: 'Express', ...result };
  }

  if (framework === 'webpack') {
    const result = await configureWebpack(certPath, keyPath);
    return { framework: 'Webpack Dev Server', ...result };
  }

  return {
    framework: 'Generic',
    updated: false,
    details: `Use cert: ${certPath} and key: ${keyPath}`
  };
}

module.exports = { configureFramework };
