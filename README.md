# Monday.com My Work Dashboard

A personal dashboard to view all your monday.com boards and assigned tasks.
Built with React + Vite, deployed on Vercel with a secure serverless API proxy.

---

## Prerequisites

- Node.js 18+ installed
- A [Vercel](https://vercel.com) account (free)
- A [GitHub](https://github.com) account (free)
- Your Anthropic API key from https://console.anthropic.com

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:5173

> **Note:** The serverless function in `/api/claude.js` only runs on Vercel.
> For local dev, Vite proxies `/api` → `localhost:3000`.
> To test locally without Vercel CLI, you can temporarily hardcode the key
> in a local express server, or use `vercel dev` (see below).

### Optional: Full local dev with Vercel CLI

```bash
npm install -g vercel
vercel dev
```

This runs both the Vite frontend and the serverless functions locally.

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/monday-dashboard.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your `monday-dashboard` repo
4. Vercel auto-detects Vite — leave settings as default
5. Click **"Deploy"**

### 3. Add your API key in Vercel

1. Go to your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-your-key-here`
   - **Environment:** Production, Preview, Development
3. Click **Save**
4. Go to **Deployments** → click the three dots on your latest deploy → **Redeploy**

Your app is now live at `https://your-project.vercel.app` 🎉

---

## Project Structure

```
monday-dashboard/
├── api/
│   └── claude.js          # Serverless function (keeps API key secure)
├── src/
│   ├── App.jsx            # Main dashboard component
│   ├── App.css            # Styles
│   ├── api.js             # Frontend API calls → /api/claude
│   ├── main.jsx           # React entry point
│   └── index.css          # Global reset
├── index.html
├── vite.config.js
├── vercel.json
├── .env.example
├── .gitignore
└── package.json
```

---

## Security

- Your `ANTHROPIC_API_KEY` is **never exposed** to the browser.
- All Anthropic API calls go through `/api/claude.js` (a Vercel serverless function).
- The frontend only calls `/api/claude` — your own endpoint.
- The `.env` file is gitignored and never committed.

---

## Customization

To change the monday.com user, update `User ID` and `User name` in:
- `src/api.js` (system prompt)
- `src/App.jsx` (header display)
