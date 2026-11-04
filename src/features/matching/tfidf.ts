/**
 * Content-Based Filtering job matcher (Research Objective 2).
 *
 * Candidate and job profiles are turned into TF-IDF vectors and compared with
 * cosine similarity:  cos(D1, D2) = (D1 · D2) / (‖D1‖ ‖D2‖).
 *
 * Fair-by-design: only skill / qualification text is vectorised. Disability
 * category, gender, ethnicity and age never enter the score.
 *
 * This TypeScript version mirrors scikit-learn's `TfidfVectorizer` defaults
 * (smooth idf, l2-normalised rows) so results line up with the Python model in
 * the FYP notebook; the dashboard can later call that model's API instead.
 */

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "basic",
  "by",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

/**
 * Turn free text into terms. Each comma-separated skill phrase contributes its
 * single words plus the whole phrase (e.g. "customer service" →
 * `customer`, `service`, `customer service`) so multi-word skills match as units.
 */
export function tokenize(text: string): string[] {
  const terms: string[] = [];
  for (const phrase of text.toLowerCase().split(/[,;\n]/)) {
    const words = phrase
      .replace(/[^a-z0-9+#.\s-]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    terms.push(...words);
    if (words.length > 1) terms.push(words.join(" "));
  }
  return terms;
}

export type SparseVector = Map<string, number>;

export interface TfidfModel {
  vocabulary: string[];
  idf: Map<string, number>;
  vectorize: (text: string) => SparseVector;
}

/** Fit IDF weights on a corpus: idf(t) = ln((1 + n) / (1 + df(t))) + 1. */
export function fitTfidf(corpus: string[]): TfidfModel {
  const n = corpus.length;
  const df = new Map<string, number>();
  for (const doc of corpus) {
    for (const term of new Set(tokenize(doc))) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((1 + n) / (1 + count)) + 1);
  }

  function vectorize(text: string): SparseVector {
    const tf = new Map<string, number>();
    for (const term of tokenize(text)) {
      if (idf.has(term)) tf.set(term, (tf.get(term) ?? 0) + 1);
    }
    const vec: SparseVector = new Map();
    let norm = 0;
    for (const [term, count] of tf) {
      const w = count * (idf.get(term) ?? 0);
      vec.set(term, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) for (const [t, w] of vec) vec.set(t, w / norm);
    return vec;
  }

  return { vocabulary: [...idf.keys()].sort(), idf, vectorize };
}

export function cosineSimilarity(a: SparseVector, b: SparseVector): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small) dot += w * (large.get(term) ?? 0);
  let na = 0;
  let nb = 0;
  for (const w of a.values()) na += w * w;
  for (const w of b.values()) nb += w * w;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export interface MatchItem {
  id: string;
  /** Text describing the item (skills + description) fed into TF-IDF. */
  text: string;
}

export interface RankedMatch<T extends MatchItem> {
  item: T;
  score: number;
  /** Terms shared by profile and item, strongest first — the explanation. */
  sharedTerms: string[];
}

/** Rank `items` against a candidate profile text by cosine similarity. */
export function rankBySimilarity<T extends MatchItem>(
  profileText: string,
  items: T[],
): RankedMatch<T>[] {
  if (items.length === 0) return [];
  const model = fitTfidf([profileText, ...items.map((i) => i.text)]);
  const profile = model.vectorize(profileText);
  return items
    .map((item) => {
      const vec = model.vectorize(item.text);
      const shared = [...profile.keys()]
        .filter((t) => vec.has(t))
        .sort(
          (x, y) =>
            (profile.get(y) ?? 0) * (vec.get(y) ?? 0) -
            (profile.get(x) ?? 0) * (vec.get(x) ?? 0),
        );
      return {
        item,
        score: cosineSimilarity(profile, vec),
        sharedTerms: shared,
      };
    })
    .sort((a, b) => b.score - a.score);
}
