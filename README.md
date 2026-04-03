# localssl-cli

One-command local HTTPS setup for local web development teams.

## What this project does

`localssl-cli` bootstraps and manages trusted local TLS certificates using `mkcert`.

Main flow (`localssl-cli` / `localssl-cli use`):
1. Ensures `mkcert` exists in `~/.localssl`
2. Initializes machine CA and attempts OS/browser trust
3. Generates project certificate files in `.localssl/`
4. Detects framework and applies HTTPS configuration when supported
5. Updates `.gitignore` to reduce accidental private key commits
6. Syncs team-safe metadata in `localssl.json`

## Install

### One-time run
```bash
npx localssl-cli
```

### Project install (recommended)
```bash
npm i -D localssl-cli
```

### Global install
```bash
npm i -g localssl-cli
```

Exposed commands: `localssl-cli` and `localssl`.

## CLI commands

### `localssl-cli` (default)
Runs project setup (`use`).

### `localssl-cli init`
Machine bootstrap only:
- mkcert setup
- machine CA install
- trust attempts for OS + Firefox + Chromium NSS DBs

### `localssl-cli use [hosts...]`
Project setup:
- host detection from `package.json` and `.env` / `.env.local`
- default hosts: `localhost`, `127.0.0.1`, `::1`
- certificate output: `.localssl/cert.pem` and `.localssl/key.pem`
- framework configuration when supported

Examples:
```bash
localssl-cli use
localssl-cli use myapp.local api.myapp.local
```

### `localssl-cli --open` / `localssl-cli use --open`
Runs setup and opens a guessed HTTPS URL.

### `localssl-cli status`
Shows CA/project cert expiry, framework detection, hosts/team summary, and renewal warning.

### `localssl-cli renew`
Regenerates project certificate files.

### `localssl-cli trust`
Imports teammate public CAs from `localssl.json` into local trust stores.

### `localssl-cli qr`
Hosts CA download endpoint and prints a terminal QR code for mobile install.

### `localssl-cli ci`
CI mode only (`CI=true`), creates temporary cert chain and exports:
- `NODE_EXTRA_CA_CERTS`
- `SSL_CERT_FILE`
- `REQUESTS_CA_BUNDLE`
- `LOCALSSL_CERT_FILE`
- `LOCALSSL_KEY_FILE`

### `localssl-cli remove`
Best-effort cleanup of trust entries and localssl artifacts.

## Framework integration

Current auto-configuration support:
- Vite
- Angular (`ng serve` + `angular.json` serve options)
- Next.js (experimental HTTPS flags)
- Create React App (`.env.local` HTTPS vars)
- Express (`localssl.js` helper)
- Webpack Dev Server (`devServer.https` injection)
- Generic fallback (manual cert/key hint)

## Postinstall behavior

On dependency install, the package can:
- wire `predev`, `prestart`, `preserve` hooks to `localssl-cli use`
- run best-effort auto setup for common dev scripts

Disable all postinstall behavior:
```bash
LOCALSSL_SKIP_POSTINSTALL=1 npm i -D localssl-cli
```

Disable only auto setup execution:
```bash
LOCALSSL_SKIP_AUTO_SETUP=1 npm i -D localssl-cli
```

## Team file and security

`localssl.json` is intended to be commit-safe and stores:
- shared hosts
- teammate machine metadata
- teammate **public** CA certificates only

Security notes:
- project private keys are written under `.localssl/`
- `.gitignore` includes private key patterns
- private key payloads are rejected from team config
- never share `~/.localssl/rootCA-key.pem`

## Programmatic usage

The package exports:

```js
const { getHttpsOptions } = require('localssl-cli');
const httpsOptions = getHttpsOptions();
```

`getHttpsOptions()` reads:
- `.localssl/cert.pem`
- `.localssl/key.pem`

from `process.cwd()` by default.

## Repository structure

- `bin/localssl.js` - CLI entrypoint (Commander)
- `src/bootstrap.js` - mkcert download/init + trust orchestration
- `src/certgen.js` - host detection + certificate generation
- `src/frameworks/*` - framework-specific config adapters
- `src/trust/*` - OS/browser trust implementations
- `src/team.js` - `localssl.json` sync/trust logic
- `src/ci.js` - CI ephemeral trust/cert setup
- `src/index.js` - library export (`getHttpsOptions`)

## Development notes

- Runtime: Node.js `>=18`
- Test script currently prints placeholder output (`No tests yet`)
- GitHub Actions workflow runs Node.js CI on 18.x/20.x/22.x

## Troubleshooting

### Browser trust not applied for Firefox/Chromium
Install NSS `certutil`, then rerun:
```bash
localssl-cli init
```

### Regenerate project certs
```bash
localssl-cli renew
```

### Windows trust behavior
Windows attempts CurrentUser trust first; if needed, it prompts for elevation for machine-wide trust.
