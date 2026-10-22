# Evolution API on Render.com Deployment Guide

This guide walks you through deploying your cloned Evolution API WhatsApp bot on **Render.com** (Free Tier, No Credit Card Required).

---

## Overview

Render hosts both the **Evolution API container** and the **free PostgreSQL database**:
- **Web Service**: Runs the Dockerized Evolution API v2.3.7.
- **Database**: Free PostgreSQL instance managed by Render.
- **HTTPS**: Automatically handled by Render (`https://your-service.onrender.com`).

---

## Step-by-Step Deployment on Render Dashboard

### Step 1: Create the Free PostgreSQL Database on Render
1. Log into [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** (top right) ➔ select **PostgreSQL**.
3. Fill in:
   - **Name**: `evolution-db`
   - **Database**: `evolution`
   - **User**: `evolution`
   - **Region**: Choose the closest region to you (e.g., `Frankfurt` or `Oregon`).
   - **Plan**: Select **Free**.
4. Click **Create Database**.
5. Once created, scroll down to the **Connections** section and copy the **Internal Database URL** *(starts with `postgresql://...`)*. You will need this in Step 2.

---

### Step 2: Create the Evolution API Web Service
1. In the Render Dashboard, click **New +** ➔ select **Web Service**.
2. Select **Build and deploy from a Git repository** and connect your repository:
   👉 `https://github.com/Aarish-shaikh/Newbot`
3. Fill in the service details:
   - **Name**: `evolution-api` (or a name of your choice, like `my-whatsapp-bot`)
   - **Region**: Same region as your database in Step 1.
   - **Branch**: `main`
   - **Runtime**: Render will automatically detect **Docker** from the `Dockerfile`.
   - **Plan**: Select **Free**.
4. Scroll down to **Environment Variables** and add the following keys:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `PORT` | `8080` | Required |
| `SERVER_URL` | `https://your-service-name.onrender.com` | Replace with your actual Render URL |
| `AUTHENTICATION_TYPE` | `apikey` | Required |
| `AUTHENTICATION_API_KEY` | `your_secure_random_key_here` | Create a long random secret key |
| `AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES` | `true` | Required |
| `DATABASE_ENABLED` | `true` | Required |
| `DATABASE_PROVIDER` | `postgresql` | Required |
| `DATABASE_CONNECTION_URI` | `postgresql://...` | **Paste Internal Database URL from Step 1** |
| `DATABASE_SAVE_DATA_INSTANCE` | `true` | Persists WhatsApp sessions |
| `DATABASE_SAVE_DATA_NEW_MESSAGE` | `true` | Persists messages |
| `DATABASE_SAVE_MESSAGE_UPDATE` | `true` | Persists message updates |
| `DATABASE_SAVE_DATA_CONTACTS` | `true` | Persists contacts |
| `DATABASE_SAVE_DATA_CHATS` | `true` | Persists chats |
| `CACHE_REDIS_ENABLED` | `false` | Disables Redis (stores in PostgreSQL) |
| `DEL_INSTANCE` | `false` | Required |
| `CONFIG_SESSION_PHONE_CLIENT` | `Evolution API` | Display name on WhatsApp |
| `CONFIG_SESSION_PHONE_NAME` | `Chrome` | Session device |

5. Click **Create Web Service**.
6. Render will pull the image and start the service in about 1–2 minutes!

---

### Step 3: Connect WhatsApp (QR Code)

1. Open your browser and go to your Render URL:
   👉 **`https://your-service-name.onrender.com/manager`**
2. Log in using your `AUTHENTICATION_API_KEY`.
3. Click **Create Instance**:
   - **Instance Name**: `newbot`
   - **Integration**: `WHATSAPP-BAILEYS`
4. Scan the QR code using your WhatsApp app (**Settings ➔ Linked Devices ➔ Link a Device**).
5. Once scanned, the status will show **Connected / Open**.

---

### Step 4: Apply Configuration & Webhook (Replay)

You can run the replay script directly from your computer against the live Render server to configure everything instantly:

1. Open `.env` on your local PC:
   ```env
   SERVER_URL=https://your-service-name.onrender.com
   AUTHENTICATION_API_KEY=your_key_set_on_render
   MY_INSTANCE_NAME=newbot
   MY_WEBHOOK_URL=https://script.google.com/macros/s/your-script-id/exec
   ```
2. Run the replay script:
   ```bash
   node replay.js
   ```
3. All instance settings, call rejection behavior, and webhook subscriptions will be applied to your Render deployment in 2 seconds!

---

## ⚡ Crucial: Keep Render Alive 24/7 (Prevent Sleeping)

On Render's Free tier, services "sleep" after 15 minutes of inactivity if no HTTP requests arrive. When it sleeps, the WhatsApp connection drops.

### How to keep it awake 24/7 for FREE:
1. Go to [cron-job.org](https://cron-job.org) (100% free, no credit card).
2. Create a free account and click **Create Cronjob**.
3. **URL**: `https://your-service-name.onrender.com/`
4. **Schedule**: Run every **10 minutes** (`*/10 * * * *`).
5. Save the job.

Because a lightweight ping hits your Evolution API root URL every 10 minutes, **Render will never put your service to sleep**, keeping your WhatsApp bot connected 24/7!
