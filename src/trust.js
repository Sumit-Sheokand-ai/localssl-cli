const { loadTeamConfig, trustTeamCertificates } = require('./team');

async function trustTeam() {
  const config = await loadTeamConfig();
  const trusted = await trustTeamCertificates(config);
  console.log(`  Trusted ${trusted} teammate CA certificate(s) ✓`);
}

module.exports = { trustTeam };
