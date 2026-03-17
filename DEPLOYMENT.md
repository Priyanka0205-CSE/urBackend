# 🚀 Deployment Guide — Render (Backend) + Vercel (Frontend)

This guide walks you through deploying a self-hosted instance of **urBackend** from scratch using **free-tier** cloud services — no Docker required.

| Layer | Platform | Cost |
| :--- | :--- | :--- |
| Node.js API | [Render](https://render.com) | Free tier |
| MongoDB | [MongoDB Atlas](https://www.mongodb.com/atlas) | Free (M0 cluster) |
| Redis | [Redis Cloud (redis.io)](https://redis.io/try-free/) | Free tier |
| React/Vite dashboard | [Vercel](https://vercel.com) | Free tier |

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Set up MongoDB Atlas](#2-set-up-mongodb-atlas)
3. [Set up Redis Cloud](#3-set-up-redis-cloud)
4. [Deploy the Backend to Render](#4-deploy-the-backend-to-render)
5. [Deploy the Frontend to Vercel](#5-deploy-the-frontend-to-vercel)
6. [Link the Frontend to the Backend](#6-link-the-frontend-to-the-backend)
7. [Verify your deployment](#7-verify-your-deployment)

---

## 1. Prerequisites

Before you start, make sure you have:

- A [GitHub](https://github.com) account with a fork of this repository.
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account (free).
- A [Redis Cloud](https://redis.io/try-free/) account (free).
- A [Render](https://render.com) account (free).
- A [Vercel](https://vercel.com) account (free).

> **Tip:** You only need to complete steps 2 and 3 once — the same Atlas cluster and Redis Cloud database can be reused across multiple deployments.

---

## 2. Set up MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and sign in.
2. Click **"Build a Database"** → choose the **Free (M0)** shared tier.
3. Select a cloud provider and region closest to your Render deployment region.
4. Enter a cluster name (e.g. `urbackend`) and click **"Create"**.
5. Under **Security → Database Access**, create a database user:
   - Username: `urbackend-user`
   - Password: generate a strong password and **copy it**.
   - Role: **"Read and write to any database"**.
6. Under **Security → Network Access**, click **"Add IP Address"** and add the outbound IP addresses of your Render service.

   > To find these IPs: open your Render service → **Info** tab → **Outbound IPs**. Render exposes a set of static outbound IPs per service; add each one individually in Atlas.

7. Go to **Database → Connect** → **"Drivers"** and copy the **connection string**. It looks like:

   ```
   mongodb+srv://urbackend-user:<password>@urbackend.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the password you copied in step 5, and append the database name before the query string:

   ```
   mongodb+srv://urbackend-user:<password>@urbackend.xxxxx.mongodb.net/urbackend?retryWrites=true&w=majority
   ```

   **Save this URL** — you will need it in step 4.

---

## 3. Set up Redis Cloud

1. Go to [redis.io/try-free](https://redis.io/try-free/) and sign up for a free account.
2. After logging in, click **"New database"**.
3. Choose the **Free** plan, then enter a database name (e.g. `urbackend-redis`) and select the cloud provider and region closest to your Render deployment.
4. Click **"Create database"**.
5. Once the database is created, open it and scroll to the **"Security"** section to note the **host**, **port**, **username** (`default`), and **password**.
6. Construct the Redis URL in this format:

   ```
   rediss://default:<password>@<host>:<port>
   ```

   **Save this URL** — you will need it in step 4.

---

## 4. Deploy the Backend to Render

### 4.1 Create a new Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com) and click **"New +"** → **"Web Service"**.
2. Connect your GitHub account and select your fork of `urBackend`.
3. Fill in the service settings:

   | Setting | Value |
   | :--- | :--- |
   | **Name** | `urbackend-api` (or any name you prefer) |
   | **Region** | Choose the region closest to your Atlas & Redis Cloud region |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

4. Click **"Advanced"** to expand the environment variable section.

### 4.2 Configure environment variables

Add **each** of the following environment variables one by one using the **"Add Environment Variable"** button:

```env
# Server
PORT=1234
NODE_ENV=production

# Database & Cache
MONGO_URL=<your MongoDB Atlas connection string from step 2>
REDIS_URL=<your Redis Cloud URL from step 3>

# Authentication — generate strong random strings (min 32 chars)
JWT_SECRET=<at_least_32_random_characters>
ENCRYPTION_KEY=<exactly_32_character_string>
API_KEY_SALT=<random_string_for_api_key_hashing>

# External Storage (Supabase) — required for file uploads
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Email (Resend) — required for OTP / email verification
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=onboarding@resend.dev

# Frontend URL — update after deploying the frontend (step 5)
FRONTEND_URL=https://your-frontend.vercel.app
```

> **Security note:** Never commit real secrets to your repository. Always use the Render environment variable panel or a secrets manager.

> **Generating secrets:** You can run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` locally to generate a strong random string for `JWT_SECRET`, `ENCRYPTION_KEY`, and `API_KEY_SALT`.

### 4.3 Deploy

1. Click **"Create Web Service"**.
2. Render will pull your code, run `npm install`, and start the server. The first deploy usually takes 2–3 minutes.
3. Once the status shows **"Live"**, copy the service URL — it looks like:

   ```
   https://urbackend-api.onrender.com
   ```

   **Save this URL** — you will need it when deploying the frontend.

### 4.4 Verify the backend

Open your browser (or use `curl`) and visit:

```
https://urbackend-api.onrender.com/health
```

You should see a `200 OK` response confirming the API is running.

> **Free tier cold starts:** Render's free tier spins down services after 15 minutes of inactivity. The first request after a cold start may take 30–60 seconds.

---

## 5. Deploy the Frontend to Vercel

### 5.1 Import the project

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Click **"Add New… → Project"** and import your fork of `urBackend`.
3. In the project configuration screen:

   | Setting | Value |
   | :--- | :--- |
   | **Root Directory** | `frontend` |
   | **Framework Preset** | Vite (auto-detected) |
   | **Build Command** | `npm run build` (default) |
   | **Output Directory** | `dist` (default) |

### 5.2 Configure the environment variable

Under **"Environment Variables"**, add:

```env
VITE_API_URL=https://urbackend-api.onrender.com
```

Replace the value with the actual Render service URL you copied in step 4.3.

> This variable tells the React app where your backend API lives. Without it, the frontend will default to `http://localhost:1234` and will not work in production.

### 5.3 Deploy

1. Click **"Deploy"**.
2. Vercel will install dependencies and build the Vite project. This usually takes under a minute.
3. Once the deployment is complete, Vercel will give you a URL like:

   ```
   https://ur-backend.vercel.app
   ```

---

## 6. Link the Frontend to the Backend

After the frontend is deployed, you must go back to Render and update the `FRONTEND_URL` environment variable:

1. In the [Render dashboard](https://dashboard.render.com), open your `urbackend-api` service.
2. Go to **"Environment"** and update:

   ```env
   FRONTEND_URL=https://ur-backend.vercel.app
   ```

3. Click **"Save Changes"**. Render will automatically redeploy the backend with the updated CORS origin.

---

## 7. Verify your deployment

1. Open your Vercel frontend URL in the browser.
2. Create a new account and log in — this exercises the Auth API against your live backend.
3. Create a project and insert a document — this confirms the MongoDB Atlas connection is working.
4. Check the Render logs (**Logs** tab on the service page) if anything is not working.

### Common issues

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| Frontend shows network error | `VITE_API_URL` is wrong or missing | Re-deploy frontend with correct env var |
| Backend returns 500 on any request | `MONGO_URL` is wrong | Check Atlas connection string & network access rules |
| Login emails not arriving | `RESEND_API_KEY` is missing/invalid | Add a valid key from [resend.com](https://resend.com) |
| File uploads fail | `SUPABASE_URL` / `SUPABASE_KEY` missing | Add valid Supabase credentials |
| Frontend CORS errors | `FRONTEND_URL` not updated on backend | Update and redeploy the Render service |

---

## 🔁 Re-deploying after code changes

- **Render** automatically redeploys when you push to the `main` branch of your GitHub fork (if auto-deploy is enabled in the Render dashboard).
- **Vercel** automatically redeploys on every push and even creates preview deployments for pull requests.

---

## 📚 Further reading

- [MongoDB Atlas documentation](https://www.mongodb.com/docs/atlas/)
- [Redis Cloud documentation](https://redis.io/docs/latest/operate/rc/)
- [Render Web Services documentation](https://docs.render.com/web-services)
- [Vercel deployment documentation](https://vercel.com/docs/deployments/overview)
- [urBackend Contributing Guide](CONTRIBUTING.md)
