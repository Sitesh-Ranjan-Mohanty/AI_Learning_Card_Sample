# AI Learning Card Generator

A small full-stack trial app for Ask Ainstein. Users enter a learning topic, the backend streams three learning cards over a WebSocket connection, and the frontend renders each card as soon as it arrives.

## Tech Stack

- React + Vite frontend
- Node.js WebSocket backend using `ws`
- Mock AI card generator in `server/cardGenerator.js`

The generator is intentionally local and deterministic so the project runs without an API key during review. The same `generateCard(topic, cardNumber)` boundary can be replaced with an OpenAI or Gemini call.

## Features

- Topic input and Generate button
- Progressive card rendering over WebSockets
- Loading, success, connection, and error states
- Success mode streams all three cards
- Failure mode streams cards 1 and 2, intentionally fails card 3, keeps prior cards visible, and retries card 3 on the same socket

## Running Locally

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3001`.

For frontend development with Vite hot reload, run these in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Then open `http://localhost:5173`.

The frontend connects to `ws://localhost:3001` by default. To override it:

```bash
VITE_WS_URL=ws://localhost:3001 npm run dev:client
```

## WebSocket Messages

Client to server:

- `generate`: `{ "type": "generate", "topic": "Photosynthesis", "mode": "success" }`
- `retry-card`: `{ "type": "retry-card" }`

Server to client:

- `started`: generation has begun
- `card`: one generated learning card
- `card-error`: an intentional card-level failure
- `complete`: all cards are ready
- `error`: validation or protocol error

## Design Decisions

- WebSocket state is kept on the connection so retry can use the same socket and remember the failed card.
- The failure mode returns after the card 3 error instead of clearing the stream, preserving cards 1 and 2 for recovery.
- Card generation is isolated behind a small function to keep the backend ready for a real AI provider without changing the WebSocket flow.
