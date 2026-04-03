const { execFile } = require('child_process');

function openBrowser(url) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('powershell', ['-NoProfile', '-Command', `Start-Process '${url}'`], { windowsHide: true }, (error) => {
        resolve(!error);
      });
      return;
    }

    if (process.platform === 'darwin') {
      execFile('open', [url], (error) => resolve(!error));
      return;
    }

    execFile('xdg-open', [url], (error) => resolve(!error));
  });
}

module.exports = { openBrowser };
