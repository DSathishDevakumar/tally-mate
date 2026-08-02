interface JaroMatches {
  aMatches: boolean[];
  bMatches: boolean[];
  matches: number;
}

/** Flags characters within the sliding window that match between `a` and `b`. */
function findMatchingChars(a: string, b: string, matchDistance: number): JaroMatches {
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  return { aMatches, bMatches, matches };
}

/** Counts transposed (out-of-order) pairs among the already-matched characters. */
function countTranspositions(a: string, b: string, { aMatches, bMatches }: JaroMatches): number {
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  return transpositions / 2;
}

// Jaro-Winkler similarity: better suited than raw edit-distance for matching person names
// against transliteration/spelling variants (e.g. "Ramya" vs. "Ramiya"), since it rewards
// shared prefixes and tolerates the odd inserted/transposed letter without over-penalizing.
function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const matchResult = findMatchingChars(a, b, matchDistance);
  if (matchResult.matches === 0) return 0;

  const transpositions = countTranspositions(a, b, matchResult);
  const { matches } = matchResult;

  return (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
}

function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  let prefixLength = 0;
  const maxPrefix = Math.min(4, a.length, b.length);
  while (prefixLength < maxPrefix && a[prefixLength] === b[prefixLength]) prefixLength++;
  return j + prefixLength * 0.1 * (1 - j);
}

/** Normalized similarity in [0, 1]; 1 means identical (case/whitespace-insensitive). */
export function similarity(a: string, b: string): number {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return 0;
  if (x === y) return 1;
  return jaroWinkler(x, y);
}

export interface ScoredMatch<T> {
  item: T;
  score: number;
}

/** Returns the top `limit` items ranked by name similarity to `query`, highest first. */
export function findBestMatches<T>(query: string, items: T[], getName: (item: T) => string, limit = 3): ScoredMatch<T>[] {
  return items
    .map((item) => ({ item, score: similarity(query, getName(item)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
