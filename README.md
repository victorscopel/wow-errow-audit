# GuildAudit

Ferramenta de auditoria de guild para WoW — rastreia equipamentos, encantamentos, gemas, M+ rating e atributos recomendados para o roster de raid.

## Visão Geral da Arquitetura

O projeto é dividido em dois componentes:

```
GitHub Pages (frontend estático)      Cloudflare Worker (backend)
──────────────────────────────         ──────────────────────────
index.html, char.html                  ► /api/token      → Blizzard OAuth (client_credentials)
app.js, api.js, char.js               ► /auth/login     → Battle.net authorize
render.js, auth.js, data.js           ► /auth/callback  → JWT
styles.css                            ► /api/roster     → KV (persistência global)
                                       ► /api/cfg        → KV (configurações)
                                       ► /api/guild-info → env vars
                                       ► /api/archon-stats → KV (prioridade de atributos)
                                       ► ?url=...&token= → Proxy Blizzard API
```

**Por que o Worker é necessário?**

O Blizzard exige `client_id` e `client_secret` para usar a API. Esses dados **não podem ficar no frontend** (seriam expostos a qualquer um). O Worker roda no servidor da Cloudflare e age como:

1. **Proxy seguro** — recebe um token JWT do usuário, valida, e repassa a chamada à Blizzard com as credenciais secretas.
2. **OAuth middleman** — processa o fluxo Battle.net login → callback → emite JWT para o browser.
3. **Banco de dados (KV)** — persiste o roster, configurações e prioridade de atributos (Archon stats) para que qualquer usuário em qualquer browser veja os mesmos dados.

> ⚠️ **O `worker.js` não está neste repositório** pois contém referências a variáveis de ambiente sensíveis e é implantado diretamente no painel da Cloudflare. Veja as instruções abaixo para configurar o seu.

---

## Funcionalidades

- **Login Battle.net** — permissões baseadas no rank da guild (admin / officer / member / guest)
- **Integração Blizzard API** via Cloudflare Worker (credenciais nunca saem do servidor)
- **Tooltips Wowhead** com ilvl, encantamentos e gemas do personagem
- **Imagens de render** via Blizzard character-media API
- **Sugestões de atributos** baseadas no Archon.gg / Top Heroic logs, salvas no KV
- **iLvl colorido** por tier (Mítico, Heroico, etc.)
- **ilvl mínimo configurável** para destacar jogadores mal equipados
- **i18n** — Português (BR) e Inglês
- **Great Vault** — acompanhamento de progresso semanal
- **Auto-refresh** a cada 15 minutos
- **Cold Start** — qualquer usuário que abrir o site pela primeira vez recebe o roster, configs e sugestões diretamente do backend

---

## Arquivos do Frontend (GitHub Pages)

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Página principal (overview, roster, vault, settings) |
| `char.html` | Página de detalhes do personagem |
| `styles.css` | Todos os estilos |
| `data.js` | Constantes, dados de classes, mapeamentos, i18n |
| `api.js` | Interação com a Blizzard API e endpoints do Worker |
| `render.js` | Funções de renderização de UI |
| `auth.js` | OAuth Battle.net + sistema de permissões JWT |
| `app.js` | Estado, navegação, ações do usuário |
| `char.js` | Lógica da página de personagem |

---

## Setup

### 1. Blizzard Developer Portal

1. Acesse [develop.battle.net/access/clients](https://develop.battle.net/access/clients)
2. Crie um client
3. Defina o **Redirect URI** como `https://your-worker.workers.dev/auth/callback`
4. Anote o **Client ID** e **Client Secret**

### 2. Cloudflare Worker

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com) e crie um Worker
2. Cole o conteúdo do `worker.js` no editor (não disponível neste repo — use sua cópia local)
3. Crie um **KV Namespace** e vincule-o com o binding `ROSTER_DB`
4. Adicione as **variáveis de ambiente** (Settings → Variables):

| Variável | Tipo | Valor |
|----------|------|-------|
| `BNET_CLIENT_ID` | Texto | Seu Blizzard Client ID |
| `BNET_CLIENT_SECRET` | **Secreto** | Seu Blizzard Client Secret |
| `BNET_REDIRECT_URI` | Texto | `https://your-worker.workers.dev/auth/callback` |
| `APP_URL` | Texto | URL do GitHub Pages (ex: `https://user.github.io/repo`) |
| `JWT_SECRET` | **Secreto** | String aleatória segura |
| `ADMIN_SUBS` | Texto | IDs Battle.net dos admins (separados por vírgula) |
| `OFFICER_SUBS` | Texto | IDs Battle.net dos officers (separados por vírgula) |
| `GUILD_REALM` | Texto | ex: `azralon` |
| `GUILD_NAME` | Texto | ex: `errow` |

5. Faça o deploy

### 3. GitHub Pages

1. Suba os arquivos do frontend para um repositório GitHub
2. Vá em **Settings → Pages → Source: Deploy from branch → main / root**
3. Site estará em `https://yourusername.github.io/repo-name/`

### 4. Configuração no App

1. Abra o site → Login com Battle.net
2. Vá em **Configurações → API Blizzard** → defina a URL do Worker, região, realm e guild
3. Clique em **Importar** para carregar o roster da guild

---

## Segurança

- **Nenhum secret no frontend** — `Client ID/Secret` ficam apenas nas env vars do Worker
- **JWT HMAC-SHA256** — tokens de 7 dias assinados pelo Worker
- **Permissões** — derivadas do rank no roster da guild (0–1 = officer, 2+ = member)
- **CORS restrito** — o Worker só aceita requisições configuradas no `APP_URL`

---

## Classes Suportadas

Todas as classes retail incluindo **Devorador** (Midnight / The War Within).
