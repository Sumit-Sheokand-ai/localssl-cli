const { initMachine } = require('./bootstrap');
const { info } = require('./utils');

async function initCommand() {
  info('Initializing machine trust...');
  await initMachine();
  info('Done.');
}

module.exports = { initCommand };
