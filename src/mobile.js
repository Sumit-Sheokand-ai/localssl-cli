const http = require('http');
const os = require('os');
const fs = require('fs-extra');
const detectPort = require('detect-port');
const qrcode = require('qrcode-terminal');
const { LOCALSSL_CA_PUBLIC, info } = require('./utils');

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const values of Object.values(interfaces)) {
    for (const item of values || []) {
      if (item.family === 'IPv4' && !item.internal) {
        return item.address;
      }
    }
  }
  return '127.0.0.1';
}

async function runQrServer() {
  if (!(await fs.pathExists(LOCALSSL_CA_PUBLIC))) {
    throw new Error('No machine CA found. Run: localssl init');
  }

  const crt = await fs.readFile(LOCALSSL_CA_PUBLIC);
  const host = getLocalIpAddress();
  const port = await detectPort(9999);

  const server = http.createServer((req, res) => {
    if (req.url === '/ca.crt') {
      res.writeHead(200, {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': 'attachment; filename="localssl-ca.crt"'
      });
      res.end(crt);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  await new Promise((resolve) => server.listen(port, resolve));

  const url = `http://${host}:${port}/ca.crt`;
  info(`Scan this QR from your phone:`);
  qrcode.generate(url, { small: true });
  info(`iOS: Settings > General > VPN & Device Management > Install > Certificate Trust Settings`);
  info(`Android: Settings > Security > Install from storage`);
  info(`Serving CA at ${url} (Ctrl+C to stop)`);
}

module.exports = { runQrServer };
