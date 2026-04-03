const { ensureMkcert } = require('./bootstrap');
const { detectHostsFromProject, generateProjectCert } = require('./certgen');

async function renew() {
  const mkcertPath = await ensureMkcert();
  const hosts = await detectHostsFromProject();
  await generateProjectCert({ mkcertPath, hosts, force: true });
  console.log('  Project certificate renewed ✓');
}

module.exports = { renew };
