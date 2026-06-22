# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## Project

A tic-tac-toe game built with Next.js (App Router) and TypeScript. It supports
two-player local play and a single-player mode against an unbeatable AI (minimax,
in `lib/gameLogic.ts`).

## Styling conventions

- **No Tailwind, no global utility frameworks.** Styling is done exclusively with
  [CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules)
  authored in SCSS.
- **Every component owns its styles.** Each component lives in its own folder
  under `components/` and is paired with a `styles.module.scss` file in that same
  folder. For example:

  ```
  components/
    Board/
      Board.tsx
      styles.module.scss
    Square/
      Square.tsx
      styles.module.scss
  ```

- Import styles as `import styles from "./styles.module.scss"` and reference
  classes via the `styles` object (e.g. `className={styles.board}`).
- Compose multiple/conditional classes by joining them, e.g.
  `[styles.square, isWinning ? styles.winning : ""].filter(Boolean).join(" ")`.
- **Only global styles** (CSS variables, resets, `body` defaults) live in
  `app/globals.scss`. Do not add component-specific rules there.
- Shared design tokens (colors) are defined as CSS custom properties in
  `app/globals.scss` (e.g. `var(--x-color)`); use them instead of hard-coding
  repeated values.

When adding a new component, create a new folder with both the `.tsx` file and
its own `styles.module.scss`. Do not share one stylesheet across components.

## Layout conventions

- Reusable components live in `components/<Name>/`.
- Pure game logic (no React) lives in `lib/`.
- Routes/pages live in `app/` (App Router).

## Commands

- `npm run dev` - start the dev server
- `npm run build` - production build
- `npm run lint` - run ESLint
