const path = require('path');
const fs = require('fs-extra');

function ensureHook(scripts, hookName, targetCommand, baseScriptName) {
  if (!scripts[baseScriptName]) {
    return false;
  }

  const current = scripts[hookName];
  if (!current) {
    scripts[hookName] = targetCommand;
    return true;
  }

  if (current.includes('localssl-cli use') || current.includes('localssl use')) {
    return false;
  }

  scripts[hookName] = `${targetCommand} && ${current}`;
  return true;
}

async function run() {
  if (process.env.LOCALSSL_SKIP_POSTINSTALL === '1') {
    return;
  }

  const packageRoot = path.resolve(__dirname, '..');
  const initCwd = path.resolve(process.env.INIT_CWD || process.cwd());
  if (initCwd === packageRoot) {
    return;
  }

  const targetPackageJsonPath = path.join(initCwd, 'package.json');
  if (!(await fs.pathExists(targetPackageJsonPath))) {
    return;
  }

  let targetPackage;
  try {
    targetPackage = await fs.readJson(targetPackageJsonPath);
  } catch {
    return;
  }

  targetPackage.scripts = targetPackage.scripts || {};

  let changed = false;
  changed = ensureHook(targetPackage.scripts, 'predev', 'localssl-cli use', 'dev') || changed;
  changed = ensureHook(targetPackage.scripts, 'prestart', 'localssl-cli use', 'start') || changed;
  changed = ensureHook(targetPackage.scripts, 'preserve', 'localssl-cli use', 'serve') || changed;

  if (!changed) {
    await autoSetupForNativeCommands(initCwd, targetPackage);
    return;
  }

  await fs.writeJson(targetPackageJsonPath, targetPackage, { spaces: 2 });
  console.log('localssl-cli: added predev/prestart/preserve HTTPS setup hooks');
  await autoSetupForNativeCommands(initCwd, targetPackage);
}

async function autoSetupForNativeCommands(projectDir, targetPackage) {
  if (process.env.LOCALSSL_SKIP_AUTO_SETUP === '1' || process.env.CI === 'true' || process.env.CI === '1') {
    return;
  }

  const scripts = targetPackage.scripts || {};
  const hasWebScript = scripts.dev || scripts.start || scripts.serve;
  if (!hasWebScript) {
    return;
  }

  const originalCwd = process.cwd();
  try {
    process.chdir(projectDir);
    const { useProject } = require('./use');
    await useProject([], { open: false });
    console.log('localssl-cli: project HTTPS auto-configured during install');
  } catch (error) {
    console.log(`localssl-cli: auto-setup skipped (${error.message})`);
  } finally {
    process.chdir(originalCwd);
  }
}

run().catch(() => {});
