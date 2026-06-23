import { useCallback, useMemo } from 'react';
import { BingoCard, CategoryId, GameState } from '../types';
import { generateCard } from '../lib/cardGenerator';
import { checkForBingo, countFilled, getClosestToWin } from '../lib/bingoChecker';
import { detectWords } from '../lib/wordDetector';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'meeting-bingo:game:v1';

const EMPTY_GAME: GameState = {
  status: 'idle',
  category: null,
  card: null,
  isListening: false,
  startedAt: null,
  completedAt: null,
  winningLine: null,
  winningWord: null,
  filledCount: 0,
};

/** Deep-ish clone of the 5x5 grid so we never mutate React state in place. */
function cloneCard(card: BingoCard): BingoCard {
  return {
    words: card.words,
    squares: card.squares.map((row) => row.map((sq) => ({ ...sq }))),
  };
}

/** Set of already-filled words (lowercased) for the detector to skip. */
function filledWordSet(card: BingoCard): Set<string> {
  return new Set(
    card.squares
      .flat()
      .filter((sq) => sq.isFilled && !sq.isFreeSpace)
      .map((sq) => sq.word.toLowerCase()),
  );
}

export function useGame() {
  const [game, setGame, clearGame] = useLocalStorage<GameState>(STORAGE_KEY, EMPTY_GAME);

  /** Recompute derived fields (filledCount, win) after any square change. */
  const finalize = useCallback(
    (card: BingoCard, base: GameState): GameState => {
      const winningLine = checkForBingo(card);
      const filledCount = countFilled(card);
      if (winningLine && base.status !== 'won') {
        // Identify the word that completed the bingo: the most recently filled
        // square on the winning line.
        const lineSquares = card.squares
          .flat()
          .filter((sq) => winningLine.squares.includes(sq.id) && !sq.isFreeSpace);
        const lastFilled = lineSquares
          .filter((sq) => sq.filledAt !== null)
          .sort((a, b) => (b.filledAt ?? 0) - (a.filledAt ?? 0))[0];
        return {
          ...base,
          card,
          filledCount,
          status: 'won',
          completedAt: Date.now(),
          winningLine,
          winningWord: lastFilled?.word ?? null,
        };
      }
      return { ...base, card, filledCount };
    },
    [],
  );

  const startGame = useCallback(
    (categoryId: CategoryId) => {
      const card = generateCard(categoryId);
      setGame({
        ...EMPTY_GAME,
        status: 'playing',
        category: categoryId,
        card,
        startedAt: Date.now(),
        filledCount: countFilled(card),
      });
    },
    [setGame],
  );

  /** Regenerate the card for the current category (fresh words, reset clock). */
  const newCard = useCallback(() => {
    setGame((prev) => {
      if (!prev.category) return prev;
      const card = generateCard(prev.category);
      return {
        ...prev,
        status: 'playing',
        card,
        startedAt: Date.now(),
        completedAt: null,
        winningLine: null,
        winningWord: null,
        filledCount: countFilled(card),
      };
    });
  }, [setGame]);

  /** Manual tap: toggle a square (free space is fixed). */
  const toggleSquare = useCallback(
    (squareId: string) => {
      setGame((prev) => {
        if (!prev.card || prev.status === 'won') return prev;
        const card = cloneCard(prev.card);
        const sq = card.squares.flat().find((s) => s.id === squareId);
        if (!sq || sq.isFreeSpace) return prev;
        const nowFilled = !sq.isFilled;
        sq.isFilled = nowFilled;
        sq.isAutoFilled = false;
        sq.filledAt = nowFilled ? Date.now() : null;
        return finalize(card, prev);
      });
    },
    [setGame, finalize],
  );

  /**
   * CRITICAL auto-fill wiring: take a final transcript chunk, detect any card
   * words within it, and fill the matching squares. Returns the words filled
   * (so the UI can toast them).
   */
  const applyTranscript = useCallback(
    (chunk: string): string[] => {
      let filledWords: string[] = [];
      setGame((prev) => {
        if (!prev.card || prev.status === 'won') return prev;
        const detected = detectWords(chunk, prev.card.words, filledWordSet(prev.card));
        if (detected.length === 0) return prev;

        const card = cloneCard(prev.card);
        const detectedLower = new Set(detected.map((w) => w.toLowerCase()));
        const justFilled: string[] = [];
        for (const sq of card.squares.flat()) {
          if (sq.isFilled || sq.isFreeSpace) continue;
          if (detectedLower.has(sq.word.toLowerCase())) {
            sq.isFilled = true;
            sq.isAutoFilled = true;
            sq.filledAt = Date.now();
            justFilled.push(sq.word);
          }
        }
        if (justFilled.length === 0) return prev;
        filledWords = justFilled;
        return finalize(card, prev);
      });
      return filledWords;
    },
    [setGame, finalize],
  );

  const setListening = useCallback(
    (isListening: boolean) => setGame((prev) => ({ ...prev, isListening })),
    [setGame],
  );

  const resetGame = useCallback(() => {
    clearGame();
    setGame(EMPTY_GAME);
  }, [clearGame, setGame]);

  const nearWin = useMemo(
    () => (game.card && game.status === 'playing' ? getClosestToWin(game.card) : null),
    [game.card, game.status],
  );

  return {
    game,
    nearWin,
    startGame,
    newCard,
    toggleSquare,
    applyTranscript,
    setListening,
    resetGame,
  };
}
