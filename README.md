# GuildAudit

WoW guild audit tool — track gear, enchants, gems and M+ ratings for your raid roster.

## Features

- **Blizzard API integration** via Cloudflare Worker proxy
- **Wowhead tooltips** with character-specific ilvl, enchants, gems
- **Character render images** from Blizzard character-media API
- **Roster filters** by class, role, armor type
- **Great Vault** progress tracking
- **CSV + JSON** export
- **Auto-refresh** every 15 minutes

## Hosting on GitHub Pages

1. Create a new GitHub repo
2. Push all files to main branch
3. Go to **Settings → Pages → Source: Deploy from branch → main / root**
4. Done — site will be at `https://yourusername.github.io/repo-name/`

The `.nojekyll` file is already included to ensure GitHub Pages serves all files correctly.

## Files

| File | Description |
|------|-------------|
| `index.html` | HTML structure |
| `styles.css` | All styles |
| `data.js` | Constants, role mappings, helpers |
| `api.js` | Blizzard API interaction |
| `render.js` | UI rendering functions |
| `app.js` | State, navigation, user actions |

## Setup

1. Get API credentials from [Blizzard Developer Portal](https://develop.battle.net/)
2. Deploy a CORS proxy (Cloudflare Worker recommended)
3. Open the app → **Configurações → API Blizzard** → fill proxy URL, client ID, secret, realm, guild
4. Click **Importar** → **Importar (ranks 0–2)**

> ⚠ For production, move the client_secret to your Worker — the frontend should never store it.
