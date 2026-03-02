# GuildAudit

WoW guild audit tool — track gear, enchants, gems and M+ ratings for your raid roster.

## Features

- **Battle.net OAuth login** — permissions based on guild rank (admin/officer/member/guest)
- **Blizzard API integration** via Cloudflare Worker (credentials never leave the server)
- **Wowhead tooltips** with character-specific ilvl, enchants, gems
- **Character render images** from Blizzard character-media API
- **i18n** — English and Portuguese (BR), including item names, issues, and UI
- **iLvl color tiers** — Midnight Season 1 thresholds (Mythic 284+, Heroic 271+, etc.)
- **Minimum iLvl highlight** — configurable threshold to flag undergeared players
- **Permission system** — admin/officer-only tabs, buttons, and settings
- **Great Vault** progress tracking
- **JSON export/import**
- **Auto-refresh** every 15 minutes
- **Responsive** — fixed-width desktop with mobile support

## Hosting on GitHub Pages

1. Push all files to a GitHub repo (main branch)
2. Go to **Settings → Pages → Source: Deploy from branch → main / root**
3. Site will be at `https://yourusername.github.io/repo-name/`

The `.nojekyll` file is included to ensure GitHub Pages serves all files correctly.

## Files

| File | Description |
|------|-------------|
| `index.html` | HTML structure |
| `styles.css` | All styles |
| `data.js` | Constants, class data, role mappings, i18n keys |
| `api.js` | Blizzard API interaction (token via Worker, no secrets) |
| `render.js` | UI rendering functions |
| `auth.js` | Battle.net OAuth + JWT permission system |
| `app.js` | State, navigation, user actions |
| `worker.js` | Cloudflare Worker source (reference — deploy via CF dashboard) |

## Setup

### 1. Blizzard Developer Portal

1. Go to [develop.battle.net/access/clients](https://develop.battle.net/access/clients)
2. Create a client
3. Set **Redirect URI** to `https://your-worker.workers.dev/auth/callback`
4. Note the **Client ID** and **Client Secret**

### 2. Cloudflare Worker

1. Create a Worker at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Paste the contents of `worker.js` in the editor
3. Add these **Environment Variables** (Settings → Variables):

| Variable | Type | Value |
|----------|------|-------|
| `BNET_CLIENT_ID` | Plaintext | Your Blizzard Client ID |
| `BNET_CLIENT_SECRET` | **Secret** | Your Blizzard Client Secret |
| `BNET_REDIRECT_URI` | Plaintext | `https://your-worker.workers.dev/auth/callback` |
| `APP_URL` | Plaintext | Your GitHub Pages URL |
| `JWT_SECRET` | **Secret** | Any random string |
| `ADMIN_SUBS` | Plaintext | Comma-separated Battle.net account IDs for admins |
| `GUILD_REALM` | Plaintext | e.g. `azralon` |
| `GUILD_NAME` | Plaintext | e.g. `errow` |

4. Deploy

### 3. App Configuration

1. Open the app → Login with Battle.net
2. Go to **Settings → API Blizzard** → set Worker URL, region, realm, guild
3. Click **Importar** → import guild roster

## Architecture

```
Browser ──► Worker /api/token ──► Blizzard OAuth (client_credentials)
Browser ──► Worker /auth/login ──► Battle.net authorize ──► /auth/callback ──► JWT
Browser ──► Worker ?url=...&token=... ──► Blizzard API (proxy)
```

- **No secrets in the frontend** — Client ID/Secret are Worker env vars only
- **JWT auth** — 7-day tokens with HMAC-SHA256 signature
- **Permissions** — derived from guild roster rank (0-1 = officer, 2+ = member)

## Supported Classes

All retail WoW classes including **Devourer** (Midnight).
