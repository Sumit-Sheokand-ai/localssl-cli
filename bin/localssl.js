#!/usr/bin/env node
const { Command } = require('commander');
const { initCommand } = require('../src/init');
const { useProject } = require('../src/use');
const { runQrServer } = require('../src/mobile');
const { runCiSetup } = require('../src/ci');
const { status } = require('../src/status');
const { renew } = require('../src/renew');
const { removeAll } = require('../src/remove');
const { trustTeam } = require('../src/trust');
const { isCI, err } = require('../src/utils');
const packageJson = require('../package.json');

const program = new Command();

program
  .name('localssl')
  .description('One-command local HTTPS setup')
  .version(packageJson.version)
  .option('-o, --open', 'open HTTPS URL in your default browser');

program
  .command('init')
  .description('Initialize machine CA and trust stores')
  .action(runGuard(initCommand));

program
  .command('use')
  .description('Generate per-project certificate and configure framework')
  .argument('[hosts...]', 'additional hosts')
  .option('-o, --open', 'open HTTPS URL in your default browser')
  .action(runGuard(async (hosts, options) => useProject(hosts || [], { open: !!options.open })));

program
  .command('status')
  .description('Show cert status and expiry')
  .action(runGuard(status));

program
  .command('renew')
  .description('Regenerate project certificate')
  .action(runGuard(renew));

program
  .command('qr')
  .description('Start mobile CA QR installer server')
  .action(runGuard(runQrServer));

program
  .command('ci')
  .description('Setup ephemeral HTTPS for CI')
  .action(runGuard(async () => {
    if (!isCI()) {
      throw new Error('CI mode expected CI=true environment variable.');
    }
    await runCiSetup();
  }));

program
  .command('trust')
  .description('Trust teammate public CAs from localssl.json')
  .action(runGuard(trustTeam));

program
  .command('remove')
  .description('Uninstall localssl from machine and project')
  .action(runGuard(removeAll));

program.action(runGuard(async () => {
  const opts = program.opts();
  await useProject([], { open: !!opts.open });
}));

program.parseAsync(process.argv);

function runGuard(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      err(error.message || 'localssl failed');
      process.exitCode = 1;
    }
  };
}
