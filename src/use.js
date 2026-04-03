const { initMachine } = require('./bootstrap');
const { detectHostsFromProject, generateProjectCert } = require('./certgen');
const { configureFramework } = require('./frameworks');
const { ensureGitignore } = require('./gitignore');
const { syncCurrentMachine, trustTeamCertificates } = require('./team');
const { step, info } = require('./utils');
const { openBrowser } = require('./open');

function defaultPortForFramework(framework) {
  if (framework === 'Vite') return 5173;
  if (framework === 'Angular') return 4200;
  if (framework === 'Next.js') return 3000;
  if (framework === 'Create React App') return 3000;
  if (framework === 'Webpack Dev Server') return 8080;
  return 3000;
}

function buildOpenUrl(hosts, framework) {
  const host = hosts.includes('localhost') ? 'localhost' : hosts[0] || 'localhost';
  const port = defaultPortForFramework(framework);
  return `https://${host}:${port}`;
}

async function useProject(hostsArg = [], options = {}) {
  info('Setting up local HTTPS for this project...');

  const total = 4;
  const { mkcertPath } = await initMachine({ quiet: true });
  step(1, total, 'Installing local CA on your machine...', 'ok');

  const detectedHosts = await detectHostsFromProject();
  const hosts = hostsArg.length ? [...new Set([...detectedHosts, ...hostsArg])] : detectedHosts;
  const certResult = await generateProjectCert({ mkcertPath, hosts });
  step(
    2,
    total,
    `Generating certificate for ${hosts[0]}...`,
    certResult.generated ? 'ok' : 'skip',
    certResult.generated ? '(valid 825 days)' : '(already configured)'
  );

  const frameworkResult = await configureFramework(certResult.certPath, certResult.keyPath);
  step(3, total, `Configuring ${frameworkResult.framework}...`, frameworkResult.updated ? 'ok' : 'skip', `(${frameworkResult.details})`);

  const gitignoreChanged = await ensureGitignore();
  step(4, total, 'Updating .gitignore...', gitignoreChanged ? 'ok' : 'skip');

  const teamConfig = await syncCurrentMachine(hosts);
  const trusted = await trustTeamCertificates(teamConfig);
  const openUrl = buildOpenUrl(hosts, frameworkResult.framework);

  info('Done. Start your dev server — HTTPS is ready.');
  info('Run: npm run dev');
  info(`Open: ${openUrl}`);
  info(`Team CAs trusted: ${trusted}`);

  if (options.open) {
    const opened = await openBrowser(openUrl);
    if (opened) {
      info('Browser opened ✓');
    }
  }
}

module.exports = { useProject };
