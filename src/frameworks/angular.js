const path = require('path');
const fs = require('fs-extra');
const { PROJECT_DIR } = require('../utils');

function addHttpsFlagsToNgServe(script, certPath, keyPath) {
  if (!/\bng\s+serve\b/.test(script)) {
    return { changed: false, value: script };
  }

  if (/--ssl\b/.test(script) || /--ssl-cert\b/.test(script) || /--ssl-key\b/.test(script)) {
    return { changed: false, value: script };
  }

  const cert = certPath.replace(/\\/g, '/');
  const key = keyPath.replace(/\\/g, '/');
  const value = `${script} --ssl true --ssl-cert \"${cert}\" --ssl-key \"${key}\"`;
  return { changed: true, value };
}

async function configureAngularScripts(certPath, keyPath) {
  const packageJsonPath = path.join(PROJECT_DIR, 'package.json');
  if (!(await fs.pathExists(packageJsonPath))) {
    return { updated: false, details: 'package.json not found' };
  }

  const pkg = await fs.readJson(packageJsonPath).catch(() => ({}));
  pkg.scripts = pkg.scripts || {};

  let changed = false;
  for (const scriptName of ['start', 'dev', 'serve']) {
    const current = pkg.scripts[scriptName];
    if (!current) continue;

    const result = addHttpsFlagsToNgServe(current, certPath, keyPath);
    if (result.changed) {
      pkg.scripts[scriptName] = result.value;
      changed = true;
    }
  }

  if (changed) {
    await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
    return { updated: true, details: 'package.json ng serve scripts updated' };
  }

  return { updated: false, details: 'ng serve scripts already configured' };
}

async function configureAngularJson(certPath, keyPath) {
  const angularJsonPath = path.join(PROJECT_DIR, 'angular.json');
  if (!(await fs.pathExists(angularJsonPath))) {
    return { updated: false, details: 'angular.json not found' };
  }

  const angular = await fs.readJson(angularJsonPath).catch(() => ({}));
  const projects = angular.projects || {};
  const defaultProject = angular.defaultProject || Object.keys(projects)[0];
  if (!defaultProject || !projects[defaultProject]) {
    return { updated: false, details: 'angular project config not found' };
  }

  const project = projects[defaultProject];
  const serve = project.architect?.serve || project.targets?.serve;
  if (!serve) {
    return { updated: false, details: 'serve target not found' };
  }

  serve.options = serve.options || {};
  const cert = certPath.replace(/\\/g, '/');
  const key = keyPath.replace(/\\/g, '/');

  const already = serve.options.ssl === true && serve.options.sslCert === cert && serve.options.sslKey === key;
  if (already) {
    return { updated: false, details: 'angular.json already configured' };
  }

  serve.options.ssl = true;
  serve.options.sslCert = cert;
  serve.options.sslKey = key;

  await fs.writeJson(angularJsonPath, angular, { spaces: 2 });
  return { updated: true, details: 'angular.json serve options updated' };
}

async function configureAngular(certPath, keyPath) {
  const scriptResult = await configureAngularScripts(certPath, keyPath);
  const jsonResult = await configureAngularJson(certPath, keyPath);

  if (scriptResult.updated || jsonResult.updated) {
    const details = [scriptResult.details, jsonResult.details].filter((x) => !/already configured|not found/.test(x)).join('; ') || 'Angular HTTPS configured';
    return { updated: true, details };
  }

  return { updated: false, details: `${scriptResult.details}; ${jsonResult.details}` };
}

module.exports = { configureAngular };
