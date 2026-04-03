const os = require('os');
const path = require('path');
const chalk = require('chalk');

const HOME_DIR = os.homedir();
const LOCALSSL_HOME = path.join(HOME_DIR, '.localssl');
const LOCALSSL_CA_PUBLIC = path.join(LOCALSSL_HOME, 'ca.crt');
const LOCALSSL_CA_KEY = path.join(LOCALSSL_HOME, 'ca.key');
const PROJECT_DIR = process.cwd();
const PROJECT_LOCALSSL_DIR = path.join(PROJECT_DIR, '.localssl');
const PROJECT_CERT = path.join(PROJECT_LOCALSSL_DIR, 'cert.pem');
const PROJECT_KEY = path.join(PROJECT_LOCALSSL_DIR, 'key.pem');
const PROJECT_CONFIG = path.join(PROJECT_DIR, 'localssl.json');

function step(index, total, message, status, details = '') {
  const state = status === 'ok' ? chalk.green('✓') : status === 'skip' ? chalk.gray('↷') : chalk.red('✗');
  const extra = details ? ` ${chalk.gray(details)}` : '';
  console.log(`  [${index}/${total}] ${message} ${state}${extra}`);
}

function info(message) {
  console.log(`  ${message}`);
}

function warn(message) {
  console.log(chalk.yellow(`  ${message}`));
}

function err(message) {
  console.error(chalk.red(`  ${message}`));
}

function isCI() {
  return process.env.CI === 'true' || process.env.CI === '1';
}

module.exports = {
  HOME_DIR,
  LOCALSSL_HOME,
  LOCALSSL_CA_PUBLIC,
  LOCALSSL_CA_KEY,
  PROJECT_DIR,
  PROJECT_LOCALSSL_DIR,
  PROJECT_CERT,
  PROJECT_KEY,
  PROJECT_CONFIG,
  step,
  info,
  warn,
  err,
  isCI
};
