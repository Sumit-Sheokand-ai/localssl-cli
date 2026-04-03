const { execFile } = require('child_process');
const { askYesNo } = require('../prompt');

function run(file, args) {
  return new Promise((resolve) => {
    execFile(file, args, { windowsHide: true }, (error) => resolve(!error));
  });
}

async function trustCurrentUserWithPowerShell(certPath) {
  const command = `Import-Certificate -FilePath \"${certPath}\" -CertStoreLocation Cert:\\CurrentUser\\Root | Out-Null`;
  return run('powershell', ['-NoProfile', '-NonInteractive', '-Command', command]);
}

async function trustMachineWithElevation(certPath) {
  const command = `$p = Start-Process certutil -ArgumentList '-addstore','-f','ROOT','${certPath}' -Verb RunAs -Wait -PassThru; if ($p.ExitCode -eq 0) { exit 0 } else { exit 1 }`;
  return run('powershell', ['-NoProfile', '-NonInteractive', '-Command', command]);
}

function trustCertificate(certPath) {
  return new Promise(async (resolve) => {
    const userViaCertutil = await run('certutil', ['-user', '-addstore', '-f', 'ROOT', certPath]);
    if (userViaCertutil) {
      resolve('Windows CurrentUser Root');
      return;
    }

    const userViaPowerShell = await trustCurrentUserWithPowerShell(certPath);
    if (userViaPowerShell) {
      resolve('Windows CurrentUser Root (PowerShell)');
      return;
    }

    const consent = await askYesNo('  Admin access needed for machine-wide trust. Continue? (y/N): ');
    if (!consent) {
      resolve('Windows trust skipped (user declined admin prompt)');
      return;
    }

    const machineStore = await trustMachineWithElevation(certPath);
    if (machineStore) {
      resolve('Windows LocalMachine Root (elevated)');
      return;
    }

    resolve('Windows trust unavailable (no changes made)');
  });
}

function untrustCertificate(certPath) {
  return new Promise((resolve) => {
    execFile('certutil', ['-user', '-delstore', 'ROOT', certPath], { windowsHide: true }, () => {
      execFile('certutil', ['-delstore', 'ROOT', certPath], { windowsHide: true }, () => resolve());
    });
  });
}

module.exports = { trustCertificate, untrustCertificate };
