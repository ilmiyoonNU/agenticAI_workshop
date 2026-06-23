# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is an Agentic Development **workshop** repo. The actual application lives in the
`MeetingBingo/` subdirectory — all build/run commands below are run from **inside
`MeetingBingo/`**, not the repo root.

`MeetingBingo/` is "Meeting Bingo": a client-only React app that generates a 5×5 buzzword
bingo card and auto-fills squares from live browser speech recognition. There is no backend
and no test suite — it is a 90-minute-MVP workshop build.

## Commands (run from `MeetingBingo/`)

```bash
npm install        # install deps (first time)
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # tsc (typecheck) + vite build → dist/
npm run typecheck  # tsc --noEmit only
npm run preview    # serve the production build
```

There is no linter and no tests configured. **`npm run build` is the gate** — it runs `tsc`
under `strict` + `noUnusedLocals`/`noUnusedParameters`, so unused imports/vars fail the build.
Use `npm run typecheck` for a fast check while iterating.

## Architecture (the big picture)

Single-page app, no router. `App.tsx` switches between four screens by local state:
`landing → category → game → win`.

**State hub: `src/hooks/useGame.ts`.** Almost all game logic and the entire game state live
here. It owns the `GameState`, persists it to `localStorage`, and exposes the actions
(`startGame`, `newCard`, `toggleSquare`, `applyTranscript`, `setListening`, `resetGame`) plus
the derived `nearWin` hint. Components are thin; they call these actions. When changing game
behavior, start in `useGame`, not in a component.

**The core data flow (speech → filled square):**
1. `useSpeechRecognition` (`src/hooks/`) wraps the Web Speech API and calls back with each
   *final* transcript chunk.
2. The chunk is passed to `useGame.applyTranscript(chunk)`.
3. That calls `detectWords()` (`src/lib/wordDetector.ts`) to match card words in the text,
   then fills the matching squares (`isAutoFilled = true`).
4. After any fill (auto or manual), `useGame` runs `checkForBingo()`
   (`src/lib/bingoChecker.ts`); a win flips `status` to `'won'` and the app shows `WinScreen`.

This word→square wiring is the heart of the app and was **not** present in the architecture
doc — it is implemented in `useGame`, not copied from the docs.

**Pure logic lives in `src/lib/`** (no React): `cardGenerator` (Fisher-Yates, center FREE
space), `bingoChecker` (12 lines + `getClosestToWin` for the "one away" hint), `wordDetector`
(word-boundary + phrase + alias matching), `shareUtils`, `utils` (`cn`). Buzzword packs are in
`src/data/categories.ts`; shared types in `src/types/index.ts`.

## Conventions & gotchas

- **Types source of truth:** the architecture doc's TypeScript types win over the PRD's. Notably
  `filledAt` is a `number` (ms), and there is no game `id`. Keep state JSON-serializable —
  it round-trips through `localStorage` (key `meeting-bingo:game:v1`).
- **Web Speech API only works in Chrome/Edge/Safari over HTTPS or `localhost`.** The app must
  stay fully playable in manual-tap mode when the API is unavailable or the mic is denied —
  never make speech a hard dependency.
- **Never mutate the card grid in place** — `useGame` clones squares before edits so React sees
  new references.
- The running transcript is intentionally capped to a rolling tail (memory bound); don't rely on
  it holding full meeting history.
- **Accessibility and reduced-motion are requirements, not polish:** bingo squares are real
  `<button>`s with ARIA, and confetti/pulse animations must respect `prefers-reduced-motion`
  (handled globally in `src/index.css`).

## Source-of-truth docs

`MeetingBingo/` contains the planning docs that define this build; read them before larger
changes. `meeting-bingo-prd.md` (requirements), `meeting-bingo-architecture.md` (design + most
reference code), `meeting-bingo-uxr.md` (UX requirements — treated as binding, not optional),
and `meeting-bingo-implementation-plan.md` (the reviewed v2.0 plan whose **Review Summary** table
lists 26 findings and how each is resolved).
