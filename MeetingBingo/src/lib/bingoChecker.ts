import { BingoCard, WinningLine } from '../types';

/**
 * Check all 12 possible winning lines (5 rows, 5 columns, 2 diagonals).
 * Returns the first winning line found, or null.
 */
export function checkForBingo(card: BingoCard): WinningLine | null {
  const { squares } = card;

  // Rows
  for (let row = 0; row < 5; row++) {
    if (squares[row].every((sq) => sq.isFilled)) {
      return { type: 'row', index: row, squares: squares[row].map((sq) => sq.id) };
    }
  }

  // Columns
  for (let col = 0; col < 5; col++) {
    if (squares.every((row) => row[col].isFilled)) {
      return { type: 'column', index: col, squares: squares.map((row) => row[col].id) };
    }
  }

  // Diagonal: top-left → bottom-right
  if ([0, 1, 2, 3, 4].every((i) => squares[i][i].isFilled)) {
    return { type: 'diagonal', index: 0, squares: [0, 1, 2, 3, 4].map((i) => `${i}-${i}`) };
  }

  // Diagonal: top-right → bottom-left
  if ([0, 1, 2, 3, 4].every((i) => squares[i][4 - i].isFilled)) {
    return { type: 'diagonal', index: 1, squares: [0, 1, 2, 3, 4].map((i) => `${i}-${4 - i}`) };
  }

  return null;
}

/**
 * Count filled squares (includes the free space).
 */
export function countFilled(card: BingoCard): number {
  return card.squares.flat().filter((sq) => sq.isFilled).length;
}

export interface NearWin {
  needed: number; // squares remaining on the closest non-complete line
  line: string; // human-readable line name
  squares: string[]; // IDs of the unfilled squares on that line
}

/**
 * Find the line closest to completing a bingo (without already being a bingo).
 * Returns null if no line is partially filled beyond the free space alone.
 * Used for the "One away!" hint and to highlight the potential winning line.
 */
export function getClosestToWin(card: BingoCard): NearWin | null {
  const { squares } = card;

  const lines: Array<{ squares: typeof squares[number]; name: string }> = [
    ...squares.map((row, i) => ({ squares: row, name: `Row ${i + 1}` })),
    ...[0, 1, 2, 3, 4].map((col) => ({
      squares: squares.map((row) => row[col]),
      name: `Column ${col + 1}`,
    })),
    { squares: [0, 1, 2, 3, 4].map((i) => squares[i][i]), name: 'Diagonal ↘' },
    { squares: [0, 1, 2, 3, 4].map((i) => squares[i][4 - i]), name: 'Diagonal ↙' },
  ];

  let best: NearWin | null = null;
  for (const line of lines) {
    const filled = line.squares.filter((sq) => sq.isFilled).length;
    const needed = 5 - filled;
    // Skip already-complete lines (needed === 0) and untouched lines.
    if (needed > 0 && needed < 5 && (best === null || needed < best.needed)) {
      best = {
        needed,
        line: line.name,
        squares: line.squares.filter((sq) => !sq.isFilled).map((sq) => sq.id),
      };
    }
  }

  return best;
}
