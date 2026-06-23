import { CategoryId, WinningLine } from '../types';
import { getCategory } from '../data/categories';

const PLAY_URL = 'https://meetingbingo.vercel.app';

export interface ShareStats {
  category: CategoryId;
  winningWord: string | null;
  winningLine: WinningLine | null;
  filledCount: number;
  elapsedMs: number;
}

/**
 * Format milliseconds as "Mm Ss" (or "Ss" under a minute).
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Build a plain-text, paste-friendly result summary. Plain text pastes cleanly
 * into Slack / Teams / Discord, and includes a link back to play.
 */
export function buildShareText(stats: ShareStats): string {
  const category = getCategory(stats.category);
  const lines = [
    '🎯 BINGO! I won Meeting Bingo 🎉',
    `📋 Pack: ${category.name}`,
    `⏱️ Time to BINGO: ${formatDuration(stats.elapsedMs)}`,
  ];
  if (stats.winningWord) lines.push(`🏆 Winning word: "${stats.winningWord}"`);
  lines.push(`📊 Squares filled: ${stats.filledCount}/25`);
  lines.push(`▶️ Play: ${PLAY_URL}`);
  return lines.join('\n');
}

export type ShareResult = 'shared' | 'copied' | 'failed';

/**
 * Share via the native share sheet when available, otherwise copy to clipboard.
 */
export async function shareResult(stats: ShareStats): Promise<ShareResult> {
  const text = buildShareText(stats);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'Meeting Bingo', text, url: PLAY_URL });
      return 'shared';
    } catch (err) {
      // User cancelled the share sheet, or it failed — fall through to copy.
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
