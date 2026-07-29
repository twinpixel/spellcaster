# Spellcaster

Duello multiplayer di gesti magici (*Waving Hands* / Richard Bartle), su **Cloudflare Worker** + PWA statica — stessa struttura di [Scent Mate](../scent_mate).

## Struttura

```
spellcaster/
├── client/                 # Frontend statico (HTML/CSS/JS, PWA)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── sw.js
│   ├── manifest.webmanifest
│   └── assets/
├── server/
│   ├── worker.template.js  # Worker (API)
│   ├── shared.js           # Motore regole + room service
│   ├── status.js           # Enchantment e vincoli pre-turno
│   ├── build.js            # → dist/worker.js
│   └── *.test.js           # Motore, casi limite, worker compilato
├── docs/RULES.md
├── Spellcaster.html        # Fonte originale regole
├── wrangler.toml
└── package.json
```

## Requisiti

- Node.js ≥ 18
- Account Cloudflare (per deploy)

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars   # opzionale
npm run icons:generate           # PNG PWA da icon.svg
```

## Dev locale

```bash
npm run cf:dev
```

Apre Wrangler con API + `client/` sullo stesso origin.

## Test

```bash
npm test               # motore + worker compilato + client (jsdom)
npm run test:coverage  # copertura del motore (shared.js + status.js)
```

`worker.template.js` non compare nel report perché viene testato attraverso
`dist/worker.js`, cioè il file davvero distribuito (il test lo ricompila).

| File | Copre |
|------|-------|
| `server/shared.test.js` | Percorsi base del motore e del room service |
| `server/spells.test.js` | Ogni incantesimo del catalogo e le cancellazioni |
| `server/engine-edge.test.js` | Casi limite, bersagli mostro, errori, helper HTTP |
| `server/worker.test.js` | `dist/worker.js` reale con un Durable Object simulato |
| `client/app.test.js` | Stato del turno, rendering, IA solitaria |

## Deploy

```bash
npm run cf:deploy
```

CI: push su `main` → `.github/workflows/deploy.yml` (serve `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`).

## API

| Method | Path | Descrizione |
|--------|------|-------------|
| `GET` | `/health` | Healthcheck |
| `GET` | `/spells` | Catalogo incantesimi |
| `POST` | `/games` | Crea partita `{ playerA?, playerB? }` |
| `GET` | `/games/:id` | Snapshot |
| `POST` | `/games/:id/join` | Entra in partita `{ playerId, name? }` |
| `POST` | `/games/:id/turn` | Invia turno `{ playerId, left, right }` |

Gesti: `F P S W D`, `stab`, `C`/`clap`, spazio/`nothing`.

## Come giocare (UI)

### Due giocatori
1. **Nuova partita (2 giocatori)** — sei il giocatore A
2. **Copia** il link e passalo all’avversario
3. L’altro apre il link ed entra come giocatore B
4. Ognuno sceglie le mani e preme **Fine turno**; il turno si risolve quando entrambi hanno inviato

### Solo
**Gioca da solo** — l’avversario passa automaticamente.

Regole complete: [docs/RULES.md](docs/RULES.md).

Le partite vivono in un **Durable Object** Cloudflare, così host e ospite condividono lo stesso stato.
