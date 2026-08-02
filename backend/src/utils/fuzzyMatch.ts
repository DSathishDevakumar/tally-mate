function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[] = new Array(rows * cols);

  for (let i = 0; i < rows; i++) dist[i * cols] = i;
  for (let j = 0; j < cols; j++) dist[j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i * cols + j] = Math.min(
        dist[(i - 1) * cols + j] + 1,
        dist[i * cols + (j - 1)] + 1,
        dist[(i - 1) * cols + (j - 1)] + cost
      );
    }
  }

  return dist[rows * cols - 1];
}

/** Normalized similarity in [0, 1]; 1 means identical (case/whitespace-insensitive). */
export function similarity(a: string, b: string): number {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return 0;
  if (x === y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
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
