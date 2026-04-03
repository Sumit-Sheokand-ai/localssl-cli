# localssl-cli

One-command local HTTPS for local development.

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

> Binary names exposed: `localssl-cli` and `localssl`.

---

## Quick start

```bash
npx localssl-cli
```

This does:
1. Installs/uses mkcert in `~/.localssl`
2. Creates machine CA and trusts it in OS store
3. Tries trust import for Firefox + Chrome/Edge NSS stores
4. Generates project cert/key in `.localssl/`
5. Configures supported framework HTTPS settings
6. Updates `.gitignore` to avoid key commits
7. Syncs team public cert metadata in `localssl.json`

Then run your app as usual (`npm run dev` / `npm start`).

---

## Auto-setup on install

`localssl-cli@0.1.3+` adds setup hooks at install time:

- Adds `predev: "localssl-cli use"` if `dev` exists
- Adds `prestart: "localssl-cli use"` if `start` exists
- If `predev`/`prestart` already exists, prepends `localssl-cli use && ...`
- Skips if already configured

Disable this behavior:
```bash
LOCALSSL_SKIP_POSTINSTALL=1 npm i -D localssl-cli
```

---

## Commands

### `localssl-cli` (default)
Runs project setup flow (`use`).

### `localssl-cli init`
Machine bootstrap only:
- mkcert setup
- machine CA install
- trust stores (OS + Firefox + Chrome/Edge NSS)

### `localssl-cli use [hosts...]`
Project setup only:
- detects hosts from `package.json` + `.env`/`.env.local`
- defaults: `localhost`, `127.0.0.1`, `::1`
- generates `.localssl/cert.pem` and `.localssl/key.pem`
- injects framework HTTPS config if supported

Examples:
```bash
localssl-cli use
localssl-cli use myapp.local api.myapp.local
```

### `localssl-cli use --open` or `localssl-cli --open`
Same as setup, then opens a guessed HTTPS URL in default browser.

### `localssl-cli trust`
Imports teammate public CAs from `localssl.json` into local trust stores.

### `localssl-cli status`
Shows:
- machine CA validity
- project cert validity
- detected framework
- hosts/team summary
- warning when cert expires in <=30 days

### `localssl-cli renew`
Regenerates project cert/key (keeps machine CA).

### `localssl-cli qr`
Starts temporary HTTP server to download CA cert and prints QR code for mobile install.

### `localssl-cli ci`
CI-only mode (`CI=true`):
- ephemeral CA/cert generation
- exports `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`
- also exports `LOCALSSL_CERT_FILE`, `LOCALSSL_KEY_FILE`

### `localssl-cli remove`
Best-effort cleanup:
- removes trust from OS/Firefox/Chrome/Edge NSS
- deletes `~/.localssl`
- deletes project `.localssl`

---

## Framework support

- **Vite**: injects HTTPS cert/key in `vite.config.*`
- **Next.js**: updates `dev` script with `--experimental-https` flags
- **Create React App**: writes HTTPS vars to `.env.local`
- **Express**: creates `localssl.js` helper exporting HTTPS options
- **Webpack Dev Server**: injects `devServer.https`
- **Generic**: prints manual cert/key usage hint

---

## Team sharing (`localssl.json`)

`localssl.json` is safe to commit.

It stores only:
- project hosts
- teammate machine metadata
- teammate **public** CA certificates

It never stores CA private keys.

---

## Security notes

- Private keys are written to project `.localssl/` and ignored by `.gitignore`
- Team file validation blocks private-key content in `localssl.json`
- Never share root CA private key files

## Windows permissions behavior

- localssl-cli first trusts certs in `CurrentUser\\Root` (no admin expected)
- if needed, it prompts: `Admin access needed for machine-wide trust. Continue? (y/N)`
- choosing `No` keeps safe mode and skips machine-wide trust
- rerunning `localssl-cli init` repairs trust if CA already exists

---

## Troubleshooting

### Windows `EPERM` when running `npx` inside this package source folder
Run from another directory, for example:
```powershell
cd $env:TEMP
npx --yes localssl-cli --help
```

### Firefox/Chrome/Edge trust skipped
Install `certutil` (NSS tools), then rerun:
```bash
localssl-cli init
```

### Rebuild certs
```bash
localssl-cli renew
```
