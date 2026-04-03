const fs = require('fs-extra');
const { X509Certificate } = require('crypto');
const { LOCALSSL_CA_PUBLIC, PROJECT_CERT, PROJECT_CONFIG, PROJECT_LOCALSSL_DIR } = require('./utils');
const { detectFramework } = require('./frameworks/detect');

function certSummary(label, certPem) {
  const cert = new X509Certificate(certPem);
  const expiry = new Date(cert.validTo);
  const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { label, expiry: expiry.toISOString().slice(0, 10), days };
}

async function status() {
  const rows = [];

  if (await fs.pathExists(LOCALSSL_CA_PUBLIC)) {
    const caText = await fs.readFile(LOCALSSL_CA_PUBLIC, 'utf8');
    rows.push(certSummary('Machine CA', caText));
  }

  if (await fs.pathExists(PROJECT_CERT)) {
    const certText = await fs.readFile(PROJECT_CERT, 'utf8');
    rows.push(certSummary('Project cert', certText));
  }

  for (const row of rows) {
    console.log(`  ${row.label.padEnd(14)} ${row.expiry} (${row.days} days)`);
  }

  const framework = await detectFramework();
  console.log(`  Framework:      ${framework}`);

  if (await fs.pathExists(PROJECT_CONFIG)) {
    const cfg = await fs.readJson(PROJECT_CONFIG);
    console.log(`  Hosts:          ${(cfg.hosts || []).join(', ') || 'localhost'}`);
    console.log(`  Team members:   ${(cfg.team || []).length}`);
  }

  if (!(await fs.pathExists(PROJECT_LOCALSSL_DIR))) {
    console.log('  localssl:       not configured');
    return;
  }

  const warning = rows.find((r) => r.days <= 30);
  if (warning) {
    console.log('  Warning: cert expires in under 30 days. Run localssl renew');
    return;
  }

  console.log('  All good ✓');
}

module.exports = { status };
