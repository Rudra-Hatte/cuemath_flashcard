# Cuemath Learning Engine (MERN)

Math-first adaptive flashcard system with:

- Multi-type cards (concept, step-by-step, mistake-based, application, reverse)
- Mistake intelligence tracking
- Confidence + time aware SM-2 scheduling
- Concept graph generation

## Monorepo Structure

- `server` - Express + MongoDB API
- `client` - React + Vite frontend

## Quick Start

1. Install dependencies

```bash
npm install
cd server && npm install
cd ../client && npm install
```

2. Configure environment

Copy `server/.env.example` to `server/.env` and set values.
Copy `client/.env.example` to `client/.env` for local frontend API config.

3. Start backend

```bash
cd server
npm run dev
```

4. Start frontend

```bash
cd client
npm run dev
```

Or run both together from root:

```bash
npm run dev
```

## Core API Endpoints

- `POST /api/upload/pdf` -> extract text from uploaded PDF
- `POST /api/decks` -> create deck
- `GET /api/decks` -> list decks
- `GET /api/decks/:deckId/cards` -> list cards for deck
- `POST /api/decks/generate` -> generate cards for a deck
- `POST /api/review/submit` -> submit review and update SM-2
- `GET /api/analytics/deck/:deckId` -> deck stats + mistake summary + concept graph

## Notes

- AI generation uses Gemini if `GEMINI_API_KEY` is set.
- Without API key, a deterministic fallback generator is used for local development.

## How Users Should Operate The App

1. Upload one chapter PDF and fill subject + topic.
2. Click `Upload + Create Deck`.
3. Click `Generate Multi-Type Cards`.
4. In practice mode, attempt first, then reveal, then mark confidence.
5. If wrong, always select mistake type before `Mark Wrong`.

This flow is now reflected in the in-app guided stepper UI.

## Deploy On Free Tiers

### 1. Deploy Backend On Render

- Push repo to GitHub.
- In Render, create a new `Web Service` from this repo.
- Use blueprint file `render.yaml` or set manually:
	- Root Directory: `server`
	- Build Command: `npm install`
	- Start Command: `npm start`
- Add env vars in Render:
	- `MONGODB_URI` (use MongoDB Atlas free tier)
	- `GEMINI_API_KEY`
	- `GEMINI_MODEL=gemini-2.5-flash-lite`
	- `CLIENT_ORIGINS=https://<your-netlify-site>.netlify.app`

### 2. Deploy Frontend On Netlify

- Create a new site from this repo.
- Netlify config is already set in `netlify.toml`:
	- Base directory: `client`
	- Build command: `npm run build`
	- Publish directory: `dist`
- Add environment variable in Netlify:
	- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`

### 3. Update CORS After Frontend URL Is Final

- Ensure Render `CLIENT_ORIGINS` exactly includes your Netlify domain.
- If you use Netlify branch deploy previews, add comma-separated origins.
