# Evolution API Deployment Guide (Oracle Cloud ARM64 Ubuntu VM)

This guide walks you through deploying your cloned Evolution API WhatsApp bot stack on an **Oracle Cloud Infrastructure (OCI) Always-Free Ampere A1 ARM64 VM (Ubuntu 22.04 / 24.04 LTS)** with automatic HTTPS via Caddy.

---

## 1. Network & Firewall Configuration (Crucial for Oracle Cloud)

Oracle Cloud enforces two firewall layers: the **OCI Virtual Cloud Network (VCN) Security List** and the **Ubuntu VM iptables rules**. You must configure both.

### A. Oracle Cloud Console (VCN Ingress Rules)
1. Go to your **Oracle Cloud Console** → **Networking** → **Virtual Cloud Networks**.
2. Click your VCN → click **Security Lists** → select the **Default Security List**.
3. Click **Add Ingress Rules** and add the following two rules:
   * **Rule 1 (HTTP)**:
     - **Source CIDR**: `0.0.0.0/0`
     - **IP Protocol**: `TCP`
     - **Destination Port Range**: `80`
     - **Description**: HTTP / Caddy Let's Encrypt challenge
   * **Rule 2 (HTTPS)**:
     - **Source CIDR**: `0.0.0.0/0`
     - **IP Protocol**: `TCP`
     - **Destination Port Range**: `443`
     - **Description**: HTTPS traffic
   * **Rule 3 (HTTP/3 Optional)**:
     - **Source CIDR**: `0.0.0.0/0`
     - **IP Protocol**: `UDP`
     - **Destination Port Range**: `443`

---

### B. Ubuntu VM Internal Firewall (iptables)
By default, Oracle Ubuntu instances reject incoming ports even if UFW is disabled. SSH into your VM and run:

```bash
# Allow HTTP, HTTPS, and HTTP/3
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 443 -j ACCEPT

# Make rules persistent across reboots
sudo apt-get update && sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

---

## 2. Install Docker & Docker Compose V2 on ARM64

Run this single block on your Ubuntu ARM64 VM to install official Docker and Node.js:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release nodejs

# Add Docker official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository (auto-detects aarch64 / arm64)
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow running docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

Verify installation:
```bash
docker --version
docker compose version
```

---

## 3. Transfer Project Files to the VM

From your Windows local machine (Command Prompt or PowerShell), copy the project folder to your VM:

```cmd
# Using SCP (replace with your VM IP and SSH key path)
scp -i "C:\path\to\your-key.key" -r E:\evolution-bot ubuntu@<VM_PUBLIC_IP>:~/evolution-bot
```

Make sure the `.env` file is present in `~/evolution-bot` on the VM:
```bash
ssh -i "C:\path\to\your-key.key" ubuntu@<VM_PUBLIC_IP>
cd ~/evolution-bot
ls -la
```

---

## 4. DNS & `.env` Configuration on the VM

### A. Point your Domain
In your domain registrar / Cloudflare DNS settings:
- Add an **A Record** pointing your domain (e.g., `bot.yourdomain.com`) to your **Oracle VM Public IP**.
- *(If using Cloudflare, set proxy to "DNS Only" initially so Caddy can easily acquire the TLS certificate).*

### B. Configure `~/evolution-bot/.env`
Edit `.env` on your VM:
```bash
nano ~/evolution-bot/.env
```

Ensure the following variables are set:
```env
# Domain & Public URL
DOMAIN=bot.yourdomain.com
SERVER_URL=https://bot.yourdomain.com

# Master API Key (Keep this secure!)
AUTHENTICATION_API_KEY=your_strong_master_key_here

# PostgreSQL Credentials (Internal)
POSTGRES_USER=evolution
POSTGRES_PASSWORD=your_strong_db_password_here
POSTGRES_DB=evolution

# Instance & Bot
MY_INSTANCE_NAME=newbot
MY_WEBHOOK_URL=https://script.google.com/macros/s/your-script-id/exec
```

---

## 5. Start the Stack

On your VM, navigate to `~/evolution-bot` and start all containers:

```bash
cd ~/evolution-bot
docker compose up -d
```

Check the startup status and logs:
```bash
# Check running containers
docker compose ps

# Check Caddy logs (verifying SSL certificate generation)
docker compose logs -f caddy

# Check Evolution API logs
docker compose logs -f evolution_api
```

---

## 6. Connect WhatsApp (QR Code)

1. Open your browser and go to your HTTPS domain:
   👉 **`https://bot.yourdomain.com/manager`**
2. Enter your `AUTHENTICATION_API_KEY` to log in.
3. If instance `newbot` is not visible, click **Create Instance**:
   - Instance Name: `newbot`
   - Integration: `WHATSAPP-BAILEYS`
4. Scan the QR code displayed on the screen using your WhatsApp mobile app (**Linked Devices → Link a Device**).
5. Confirm the status turns **Connected / Open**.

---

## 7. Run the Replay Script

Once your instance is connected, apply your friend's exact settings and webhook configuration to your new instance:

```bash
cd ~/evolution-bot
bash replay.sh
```

*(Or run `node replay.js`)*

### What the script does:
1. Applies identical call rejection, read receipts, and online status settings (`settings/set`).
2. Configures the webhook URL and event subscriptions (`webhook/set`) for `MESSAGES_UPSERT`.
3. Sets Evolution Bot global timings, keyword finishes, and debounce rules (`evolutionBot/settings`).
4. Verifies the live instance configuration against the original export and prints a clean diff confirmation.

---

## 8. Test Your Bot

1. Send a message to your WhatsApp number from a different phone.
2. Watch live Evolution API logs to verify message forwarding:
   ```bash
   docker compose logs -f evolution_api
   ```
3. Watch Caddy access logs:
   ```bash
   docker compose logs -f caddy
   ```

---

## Useful Maintenance Commands

```bash
# Stop stack
docker compose down

# Restart stack
docker compose restart

# View logs with timestamps
docker compose logs -tf --tail=100 evolution_api

# Update Evolution API image in future
docker compose pull
docker compose up -d
```
