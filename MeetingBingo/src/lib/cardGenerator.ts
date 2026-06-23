import { BingoCard, BingoSquare, CategoryId } from '../types';
import { getCategory } from '../data/categories';

/**
 * Fisher-Yates shuffle (non-mutating).
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a unique 5x5 bingo card for a category. The center square (2,2) is
 * a pre-filled FREE space; the remaining 24 squares are random unique words.
 */
export function generateCard(categoryId: CategoryId): BingoCard {
  const category = getCategory(categoryId);

  const selectedWords = shuffle(category.words).slice(0, 24);

  const squares: BingoSquare[][] = [];
  let wordIndex = 0;

  for (let row = 0; row < 5; row++) {
    const rowSquares: BingoSquare[] = [];
    for (let col = 0; col < 5; col++) {
      const isFreeSpace = row === 2 && col === 2;
      rowSquares.push({
        id: `${row}-${col}`,
        word: isFreeSpace ? 'FREE' : selectedWords[wordIndex++],
        isFilled: isFreeSpace, // Free space starts filled
        isAutoFilled: false,
        isFreeSpace,
        filledAt: isFreeSpace ? Date.now() : null,
        row,
        col,
      });
    }
    squares.push(rowSquares);
  }

  return { squares, words: selectedWords };
}
