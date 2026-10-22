# Evolution API WhatsApp Bot Cloner & Deployment Stack

A production-ready, multi-architecture deployment and configuration-cloning stack for [Evolution API v2](https://github.com/evolution-foundation/evolution-api) (WhatsApp Baileys engine).

This repository contains the complete configuration pipeline to export, sanitize, replay, and deploy an Evolution API instance with **PostgreSQL 15**, **Redis Alpine**, and **Caddy** for automatic HTTPS.

---

## Architecture & Features

```text
[ Internet / WhatsApp Webhooks ]
               │
               ▼  Ports 80 / 443 (HTTPS)
      ┌──────────────────┐
      │  Caddy Container │ (Automatic SSL / Reverse Proxy)
      └────────┬─────────┘
               │  Internal Network (evolution-net)
               ▼
      ┌──────────────────┐
      │  Evolution API   │ (v2.3.7 - WhatsApp Engine)
      └───┬──────────┬───┘
          │          │
          ▼          ▼
   ┌────────────┐ ┌────────────┐
   │ PostgreSQL │ │   Redis    │ (Isolated internal databases)
   └────────────┘ └────────────┘
```

- **Multi-Architecture**: Runs natively on both `x86_64` (local PCs) and `linux/arm64` (Oracle Cloud Ampere A1 Always-Free VMs).
- **Network Isolation**: PostgreSQL (`5432`) and Redis (`6379`) have **no published host ports** and exist strictly inside `evolution-net`. Evolution API binds only to localhost (`127.0.0.1:8080`) when Caddy handles public traffic.
- **Automated HTTPS**: Caddy manages TLS certificates automatically via Let's Encrypt / ZeroSSL for your domain.
- **Safe Replay Script**: `replay.js` applies instance configurations, webhook subscriptions, and support settings without creating duplicate records.

---

## Project Structure

```text
├── docker-compose.yml       # Production & Local container stack
├── Caddyfile                # Automatic HTTPS reverse proxy config
├── .env.example             # Documented environment template
├── DEPLOY.md                # Step-by-step Oracle Cloud Ubuntu VM guide
├── export.js                # Read-only exporter from source Evolution API
├── sanitize.js              # Strips instance IDs, JIDs, and personal tokens
├── replay.js                # Applies sanitized config to target instance
├── replay.sh                # Linux bash launcher for replay.js
└── sanitized/               # Clean configuration templates
    ├── instance.json        # Instance parameters
    ├── settings.json        # Privacy, call rejection, read receipts
    ├── webhook.json         # Webhook events (MESSAGES_UPSERT)
    ├── chatwoot.json        # Optional Chatwoot support inbox config
    └── evolutionBot_settings.json # Timings and keyword debounce rules
```

---

## Quick Start (Local Testing)

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- [Node.js](https://nodejs.org/) (v18+) for running utility scripts.

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Edit `.env` and configure:
```env
SERVER_URL=http://localhost:8080
AUTHENTICATION_API_KEY=your_secure_random_api_key_here
POSTGRES_PASSWORD=your_secure_db_password_here
MY_INSTANCE_NAME=newbot
MY_WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
```

### 3. Launch Containers
```bash
docker compose up -d
```
Verify all 4 services are healthy:
```bash
docker compose ps
```

### 4. Connect WhatsApp
1. Open the Evolution Manager UI in your browser:
   👉 **`http://localhost:8080/manager`**
2. Log in using your `AUTHENTICATION_API_KEY`.
3. Create an instance named `newbot` (Integration: `WHATSAPP-BAILEYS`).
4. Scan the QR code using your WhatsApp mobile app (**Settings ➔ Linked Devices ➔ Link a Device**).

### 5. Apply Configuration Replay
Once your WhatsApp instance shows **Connected**, run the replay script:
```bash
node replay.js
```
The script will configure your settings, activate the webhook forwarding (`MESSAGES_UPSERT`), and run a live verification check.

---

## Cloud Deployment (Oracle Cloud ARM64 VM)

For full instructions on setting up an **Oracle Cloud Always-Free Ampere A1 (Ubuntu 24.04)** VM with firewall rules, DNS, and automatic SSL, see **[`DEPLOY.md`](./DEPLOY.md)**.

### Summary:
1. Point your domain (or DuckDNS) A record to your VM's public IP.
2. In Oracle VCN & Ubuntu iptables, allow ports `80` and `443`.
3. Transfer project files to your VM:
   ```bash
   scp -r . ubuntu@<VM_IP>:~/evolution-bot
   ```
4. Start the stack:
   ```bash
   docker compose up -d
   ```
5. Access your secure Manager at `https://yourdomain.com/manager`, link WhatsApp, and execute `bash replay.sh`.

---

## Security & Best Practices

- **Never commit `.env`**: `.env` is included in `.gitignore` to prevent secret leaks.
- **Never commit raw `exports/`**: The `exports/` directory may contain private WhatsApp phone numbers, contact lists, or tokens. Only sanitized files in `sanitized/` are version-controlled.
- **Independent Bot Logic**: Evolution API functions as a WhatsApp gateway; the actual chatbot intelligence lives behind the `MY_WEBHOOK_URL` (Google Apps Script, n8n, Node.js server, etc.).
