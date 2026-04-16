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
cd server && npm install
cd ../client && npm install
```

2. Configure environment

Copy `server/.env.example` to `server/.env` and set values.

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

## Core API Endpoints

- `POST /api/upload/pdf` -> extract text from uploaded PDF
- `POST /api/decks` -> create deck
- `GET /api/decks` -> list decks
- `GET /api/decks/:deckId/cards` -> list cards for deck
- `POST /api/cards/generate` -> generate cards from text/topic
- `POST /api/review/submit` -> submit review and update SM-2
- `GET /api/analytics/deck/:deckId` -> deck stats + mistake summary + concept graph

## Notes

- AI generation supports OpenAI if `OPENAI_API_KEY` is set.
- Without API key, a deterministic fallback generator is used for local development.
