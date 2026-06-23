/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize text for comparison (lowercase, normalize quotes, collapse space).
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True if `phrase` appears in `haystack` respecting word boundaries.
 * Works for both single words and multi-word phrases.
 */
function containsPhrase(haystack: string, phrase: string): boolean {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  const pattern = new RegExp(`(?:^|\\W)${escapeRegex(normalizedPhrase)}(?:\\W|$)`, 'i');
  return pattern.test(haystack);
}

/**
 * Common spoken variations / synonyms. Each alias is matched with the same
 * word-boundary rule as the words themselves (no loose substring matching),
 * so e.g. "api" no longer false-matches inside unrelated speech.
 */
export const WORD_ALIASES: Record<string, string[]> = {
  'ci/cd': ['ci cd', 'cicd', 'continuous integration', 'continuous delivery'],
  mvp: ['minimum viable product'],
  roi: ['return on investment'],
  devops: ['dev ops', 'dev-ops'],
  'a/b test': ['ab test', 'a b test', 'split test'],
};

/**
 * Detect which card words appear in a transcript chunk.
 * Skips words already filled (keyed by lowercased word) and checks aliases.
 * Returns the array of matched card words (original casing).
 */
export function detectWords(
  transcript: string,
  cardWords: string[],
  alreadyFilled: Set<string>,
): string[] {
  const haystack = normalizeText(transcript);
  const detected: string[] = [];

  for (const word of cardWords) {
    if (alreadyFilled.has(word.toLowerCase())) continue;

    if (containsPhrase(haystack, word)) {
      detected.push(word);
      continue;
    }

    const aliases = WORD_ALIASES[word.toLowerCase()];
    if (aliases?.some((alias) => containsPhrase(haystack, alias))) {
      detected.push(word);
    }
  }

  return detected;
}
