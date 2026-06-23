# Meeting Bingo — Implementation Plan

**Version**: 2.0 (post-review)
**Date**: June 23, 2026
**Status**: Reviewed — In Build
**Based on**: `meeting-bingo-prd.md`, `meeting-bingo-architecture.md`, `meeting-bingo-uxr.md`
**Reviewers**: VP Product, VP Engineering, VP Design (plan-review skill)

---

## Review Summary

Reviewed June 23, 2026 by three parallel VP perspectives. **26 findings** (1 Critical,
7 High, 10 Medium, 8 Low). The user elected to address **all** findings; each is folded into
the phases below and tracked in the Revision History. Three suspected issues were checked and
**cleared**: per-category word counts are sufficient (46–48 unique words ≥ 24 needed);
`filledAt` as a `number` is JSON-serializable for persistence; word-alias casing is consistent.

### Changes Applied

| # | Sev | Category | Finding | Resolution |
|---|-----|----------|---------|------------|
| 1 | Critical | Blocker | No detected-word→square mapping; core auto-fill unspecified | `useGame.applyTranscript()` detects words per transcript chunk and fills matching squares (`src/hooks/useGame.ts`) |
| 2 | High | Blocker | `tsc` build fails: strict unused checks + missing Web Speech DOM types | Added `@types/dom-speech-recognition`, set tsconfig `lib`, pruned unused symbols |
| 3 | High | Anti-pattern | `onend` restart read state inside setState updater; could throw | Restart driven by `shouldListenRef`, outside setState, in try/catch |
| 4 | High | Missing-req | Mic permission flow + privacy copy absent (US-2.1) | Pre-permission explainer + "Audio processed locally. Never recorded." + active indicator |
| 5 | High | Missing-req | "One square away" hint + winning-line highlight absent (US-3.2) | `getClosestToWin` repaired and wired to a near-win hint in GameBoard |
| 6 | High | Accessibility | Squares lack keyboard nav / focus / ARIA (US-3.1) | Real `<button>`s with `aria-pressed`, `aria-label`, focus ring |
| 7 | High | Accessibility | No `prefers-reduced-motion` guard for confetti/pulse | Global reduced-motion CSS + confetti suppressed under the media query |
| 8 | High | Accessibility | WCAG contrast unverified for filled/winning backgrounds | White text on `#3b82f6`; dark text on light fills; verified at build |
| 9 | Med | Missing-req | Detected-word toast + `aria-live` absent (US-2.3) | `ui/Toast.tsx` + polite live region announcing fills |
| 10 | Med | Missing-req | localStorage persistence undesigned (P1) | `useLocalStorage` + versioned key `meeting-bingo:game:v1`, hydrate/save |
| 11 | Med | Anti-pattern | `'api':['interface']` alias false-matches; raw `includes` | Dropped broad alias; aliases now use word-boundary matching |
| 12 | Med | Regression | Stored transcript grows unbounded | Transcript capped to a rolling 500-char tail |
| 13 | Med | Missing-req | Category preview + regenerate-before-start (US-1.2/1.3) | Sample-word preview in CategorySelect + "New Card" regenerate |
| 14 | Med | Conflict | WinScreen omits "category played" (US-4.2) | Category included in win stats + share text |
| 15 | Med | Missing-req | Share lacks play URL + paste-friendly text (US-4.3) | `shareUtils` builds plain-text summary incl. play URL; native share→clipboard |
| 16 | Med | Missing-req | Permission-denied / no-API UX undefined | Visible fallback message routing to manual mode + retry |
| 17 | Med | Missing-req | Mobile responsive only a "tweak" | First-class responsive grid + ≥44px touch targets |
| 18 | Med | Accessibility | No `aria-live` for status/win changes | Live-region announcements for listening + BINGO |
| 19 | Med | Scope | UXR treated as optional | UXR treated as binding for the UX items above |
| 20 | Low | Conflict | Arch file list vs plan diverge (Card/Toast/useGame/Context) | Reconciled: `useGame`, `ui/Toast` added; unused arch files dropped intentionally |
| 21 | Low | Conflict | PRD §4 types stale vs arch | Arch types are source of truth (`filledAt: number`, no `id`) |
| 22 | Low | Conflict | `categories.ts` word deltas vs PRD | Code comment documents the specific deltas |
| 23 | Low | Anti-pattern | `getClosestToWin` brittle sentinel | Rewritten to return a typed `NearWin | null` |
| 24 | Low | Missing-req | Manual vs auto-fill visual distinction | Distinct styling for `isAutoFilled` squares |
| 25 | Low | Conflict | "No sound by default" not explicit | Confetti is silent; no audio added — noted |
| 26 | Low | Missing-req | §9.3 edge cases not in verification | Added to the verification checklist |

### Revision History

- **v2.0 (2026-06-23)** — Incorporated all 26 VP review findings (table above). Status moved
  to *Reviewed — In Build*. Added `useGame`/`useLocalStorage`/`ui.Toast`; treated arch types
  and UXR UX requirements as binding.
- **v1.0 (2026-06-23)** — Initial implementation plan derived from PRD + architecture docs.

---

## 1. Overview

A single-page React app that:

1. Generates a 5×5 buzzword bingo card from a chosen category.
2. Auto-fills squares via browser speech recognition (Web Speech API) during a meeting.
3. Detects BINGO (rows / columns / diagonals).
4. Celebrates with confetti and shows game stats.
5. Lets the player share the result.

Zero backend — everything runs client-side. Audio is processed locally and never recorded or transmitted.

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + canvas-confetti. Persistence via `localStorage`.

---

## 2. Build Approach

Scaffold the project **in place** inside the existing `MeetingBingo/` directory (keeping the three planning docs), then implement against the structure defined in the architecture doc.

---

## 3. Phases

### Phase 1 — Project scaffold & config
- `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`,
  `tailwind.config.js`, `postcss.config.js`, `index.html`,
  `src/vite-env.d.ts`, `src/index.css`, `public/favicon.svg`
- Run `npm install` (react, react-dom, canvas-confetti + dev tooling)

### Phase 2 — Core logic & data
- `src/types/index.ts` — TypeScript interfaces (from arch doc)
- `src/data/categories.ts` — 3 buzzword packs (Agile, Corporate, Tech), 40+ words each
- `src/lib/cardGenerator.ts` — Fisher-Yates shuffle, 24 words + center free space
- `src/lib/bingoChecker.ts` — 12 winning lines + progress helpers
- `src/lib/wordDetector.ts` — case-insensitive word-boundary + phrase + alias matching
- `src/lib/utils.ts` — `cn` classname helper
- `src/lib/shareUtils.ts` — clipboard + native share sheet text summary

### Phase 3 — Speech recognition
- `src/hooks/useSpeechRecognition.ts` — Web Speech API wrapper
  (continuous, interim results, auto-restart, feature detection, graceful fallback)

### Phase 4 — Components / screens
- `LandingPage` → `CategorySelect` → `GameBoard` → `WinScreen`
- `GameBoard` contains `BingoCard` / `BingoSquare`, `TranscriptPanel`, `GameControls`
- `App.tsx` — screen routing + game state
- `ui/Button.tsx`
- Manual tap toggle, progress counter, listening indicator, mobile-responsive grid

### Phase 5 — Polish & verify
- Confetti on win, winning-line highlight, win stats (time / winning word / filled count)
- `localStorage` persistence of in-progress game
- `npm run typecheck` + `npm run build` to confirm it compiles; start dev server

---

## 4. Project Structure (target)

```
MeetingBingo/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── components/
    │   ├── LandingPage.tsx
    │   ├── CategorySelect.tsx
    │   ├── GameBoard.tsx
    │   ├── BingoCard.tsx
    │   ├── BingoSquare.tsx
    │   ├── TranscriptPanel.tsx
    │   ├── WinScreen.tsx
    │   ├── GameControls.tsx
    │   └── ui/
    │       └── Button.tsx
    ├── hooks/
    │   └── useSpeechRecognition.ts
    ├── lib/
    │   ├── cardGenerator.ts
    │   ├── bingoChecker.ts
    │   ├── wordDetector.ts
    │   ├── shareUtils.ts
    │   └── utils.ts
    ├── data/
    │   └── categories.ts
    └── types/
        └── index.ts
```

---

## 5. Notes / Deviations from Docs

- The architecture doc's `categories.ts` differs slightly from the PRD's word lists; the
  arch doc version is used as the implementation source of truth (both satisfy the 40+ words
  requirement).
- Adding `@types/canvas-confetti` (omitted in the doc; needed for the TypeScript build).
- Speech recognition only works in Chrome / Edge / Safari over HTTPS or localhost. The game
  remains fully playable in manual-tap mode otherwise (per the doc's fallback requirement).
- The 49 KB UXR doc is treated as supporting reference for visual polish; the PRD's layout
  specs already cover the screen designs needed for the MVP.

---

## 6. Acceptance / Verification

- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm run dev` serves the app
- [ ] Card generates with 24 unique words + center free space
- [ ] Manual tap toggles squares; BINGO detected for rows/columns/diagonals
- [ ] Win screen shows time, winning word, and filled count; confetti plays
- [ ] Speech recognition auto-fills squares in supported browsers; manual fallback otherwise

---

*Document prepared for 021.School Workshop — implementation phase.*
*Estimated scope: ~25 source/config files.*
