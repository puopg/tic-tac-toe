# Tic-Tac-Toe

A tic-tac-toe game built with Next.js (App Router) and TypeScript.

## Features

- **Two game modes:** local two-player (hotseat) or single-player vs an AI.
- **Unbeatable AI:** the computer uses the minimax algorithm, so the best you can
  do against it is draw.
- **Scoreboard** tracking wins for each side and draws across rounds.
- **Win-line highlight** and a clear turn/winner status indicator.
- Responsive, dark-themed UI styled with **SCSS CSS Modules** (no Tailwind).

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - run the production build
- `npm run lint` - lint the codebase

## Project structure

```
app/                     # App Router entry (layout, page, global styles)
components/<Name>/        # One folder per component, each with styles.module.scss
lib/gameLogic.ts          # Pure game logic: winner detection + minimax AI
```

See [AGENTS.md](./AGENTS.md) for contribution conventions (notably the styling
rules).
