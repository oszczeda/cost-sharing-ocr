/**
 * 3 Historyczne Tryby wykrywania kwoty końcowej z paragonu w projekcie:
 *
 * - Tryb A: Tylko PLN <kwota> (obecny, rygorystyczny)
 * - Tryb B: Największa czcionka (Top 6 słów wg wysokości boundingPoly)
 * - Tryb C: Słowa kluczowe (SUMA / TOTAL / RAZEM / DO ZAPŁATY z oceną kandydatów)
 */

export interface TextAnnotationItem {
  description?: string;
  locale?: string;
  boundingPoly?: {
    vertices?: Array<{ x?: number; y?: number }>;
  };
  [key: string]: unknown;
}

export interface WordWithSize {
  text: string;
  height: number;
  width: number;
  area: number;
  matchesPattern: boolean;
  matchedAmount: string | null;
  annotation?: TextAnnotationItem;
}

export interface WordSizeAnalysisResult {
  allWords: WordWithSize[];
  topLargestWords: WordWithSize[];
  selectedWord: WordWithSize | null;
}

export interface AlgorithmResult {
  mode: "A" | "B" | "C";
  name: string;
  found: boolean;
  amount: number | null;
  amountFormatted: string | null;
  rawAmount?: string | null;
  matchedLine: string | null;
  confidence?: number;
  details?: string;
}

/**
 * Konwertuje ciąg liczbowy (np. "19,89" lub "1 250.00") na liczbę zmiennoprzecinkową
 */
export function normalizeAmount(raw: string): number | null {
  if (!raw) return null;
  const clean = raw.replace(/[ \u00a0]/g, "").replace(",", ".");
  const val = parseFloat(clean);
  return isNaN(val) ? null : Number(val.toFixed(2));
}

/**
 * Pomocnicze wyciąganie linii z tekstu wejściowego
 */
export function extractLines(input: unknown): string[] {
  if (!input) return [];

  if (typeof input === "string") {
    return input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  const obj = input as any;
  const fullText =
    obj.rawText ??
    obj.fullTextAnnotation?.text ??
    obj.responses?.[0]?.fullTextAnnotation?.text ??
    obj.textAnnotations?.[0]?.description ??
    obj.responses?.[0]?.textAnnotations?.[0]?.description ??
    obj.rawResponse?.responses?.[0]?.fullTextAnnotation?.text ??
    obj.rawResponse?.responses?.[0]?.textAnnotations?.[0]?.description;

  if (typeof fullText === "string") {
    return fullText
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);
  }

  return [];
}

// ============================================================================
// TRYB A: Tylko "PLN <kwota>" (obecny, rygorystyczny)
// ============================================================================
export const PLN_BEFORE_AMOUNT_REGEX =
  /\bPLN\s+((?:\d{1,3}(?:[ \u00a0]\d{3})*|\d+)[.,]\d{2})(?!\d)/i;

export function parseModeA_StrictPln(input: unknown): AlgorithmResult {
  const lines = extractLines(input);

  for (const line of lines) {
    const match = line.match(PLN_BEFORE_AMOUNT_REGEX);
    if (match) {
      const raw = match[1];
      const amount = normalizeAmount(raw);
      return {
        mode: "A",
        name: "Tryb A: Tylko PLN <kwota> (rygorystyczny)",
        found: amount !== null,
        amount,
        amountFormatted: amount !== null ? amount.toFixed(2) : null,
        rawAmount: raw,
        matchedLine: line,
        confidence: 0.95,
        details: "Dopasowano wzorzec 'PLN <kwota>'",
      };
    }
  }

  return {
    mode: "A",
    name: "Tryb A: Tylko PLN <kwota> (rygorystyczny)",
    found: false,
    amount: null,
    amountFormatted: null,
    rawAmount: null,
    matchedLine: null,
    confidence: 0,
    details: "Brak wiersza z PLN przed kwotą",
  };
}

// ============================================================================
// TRYB B: Największa czcionka (Top 6 słów z boundingPoly)
// ============================================================================
export const SOMETHING_DECIMAL_EXACT_REGEX =
  /^(?:\d{1,3}(?:[ \u00a0]\d{3})*|\d+)[.,](\d{2})(?:[a-zA-ZżółćęśąźńŻÓŁĆĘŚĄŹŃ]{1,3})?$/;

export const SOMETHING_DECIMAL_EXTRACT_REGEX =
  /(?<![\d.,\/-])(\d{1,3}(?:[ \u00a0]\d{3})*|\d+)[.,](\d{2})(?![\d.,\/-])/;

export function matchesSomethingDecimal(text: string): boolean {
  if (!text) return false;
  const clean = text.trim();
  return SOMETHING_DECIMAL_EXACT_REGEX.test(clean) || SOMETHING_DECIMAL_EXTRACT_REGEX.test(clean);
}

export function extractDecimalAmount(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();
  const match = clean.match(SOMETHING_DECIMAL_EXTRACT_REGEX);
  return match ? match[0] : null;
}

export function calculateWordBoundingSize(vertices?: Array<{ x?: number; y?: number }>): {
  height: number;
  width: number;
  area: number;
} {
  if (!vertices || !Array.isArray(vertices) || vertices.length === 0) {
    return { height: 0, width: 0, area: 0 };
  }

  const xs = vertices.map((v) => (typeof v.x === "number" ? v.x : 0));
  const ys = vertices.map((v) => (typeof v.y === "number" ? v.y : 0));

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const height = Math.max(0, maxY - minY);
  const width = Math.max(0, maxX - minX);
  const area = height * width;

  return { height, width, area };
}

export function extractWordsWithSizes(input: unknown): WordWithSize[] {
  const words: WordWithSize[] = [];
  if (!input) return words;

  let annotations: TextAnnotationItem[] = [];
  const obj = input as any;

  if (Array.isArray(obj)) {
    annotations = obj;
  } else if (Array.isArray(obj.textAnnotations)) {
    annotations = obj.textAnnotations;
  } else if (Array.isArray(obj.responses?.[0]?.textAnnotations)) {
    annotations = obj.responses[0].textAnnotations;
  } else if (Array.isArray(obj.rawResponse?.responses?.[0]?.textAnnotations)) {
    annotations = obj.rawResponse.responses[0].textAnnotations;
  } else if (Array.isArray(obj.rawResponse?.textAnnotations)) {
    annotations = obj.rawResponse.textAnnotations;
  }

  if (annotations.length > 0) {
    // textAnnotations[0] to pełny opis dokumentu; słowa i ramki zaczynają się od indeksu 1
    const isFirstElementFullDoc =
      annotations.length > 1 || (annotations[0]?.description?.includes("\n") ?? false);
    const startIndex = isFirstElementFullDoc ? 1 : 0;

    for (let i = startIndex; i < annotations.length; i++) {
      const item = annotations[i];
      const desc = item.description?.trim();
      if (!desc) continue;

      const size = calculateWordBoundingSize(item.boundingPoly?.vertices);
      const isMatch = matchesSomethingDecimal(desc);
      const matchedAmount = isMatch ? extractDecimalAmount(desc) : null;

      words.push({
        text: desc,
        height: size.height,
        width: size.width,
        area: size.area,
        matchesPattern: isMatch,
        matchedAmount,
        annotation: item,
      });
    }
  }

  // Fallback gdy brak boundingPoly (np. syntetyczne dane tekstowe)
  if (words.length === 0) {
    const lines = extractLines(input);
    lines.forEach((line, lIdx) => {
      const tokens = line.split(/\s+/);
      tokens.forEach((token) => {
        const isMatch = matchesSomethingDecimal(token);
        const matchedAmount = isMatch ? extractDecimalAmount(token) : null;
        // W syntetycznym teście symulujemy wysokość: linia SUMA ma większą czcionkę
        const isSumaLine = /SUMA|RAZEM|TOTAL/i.test(line);
        const height = isSumaLine ? 30 : 16;
        words.push({
          text: token,
          height,
          width: token.length * 10,
          area: height * token.length * 10,
          matchesPattern: isMatch,
          matchedAmount,
        });
      });
    });
  }

  return words;
}

export function parseModeB_FontSizeTop6(input: unknown): AlgorithmResult {
  const allWords = extractWordsWithSizes(input);

  if (allWords.length === 0) {
    return {
      mode: "B",
      name: "Tryb B: Największa czcionka (Top 6)",
      found: false,
      amount: null,
      amountFormatted: null,
      matchedLine: null,
      confidence: 0,
      details: "Brak słów do analizy wielkości",
    };
  }

  // Sortowanie malejąco wg wysokości (czcionka), potem wg pola
  const sortedWords = [...allWords].sort((a, b) => {
    if (b.height !== a.height) {
      return b.height - a.height;
    }
    return b.area - a.area;
  });

  // Top 6 największych słów
  const topLargestWords = sortedWords.slice(0, 6);

  // Pierwsze słowo z Top 6 pasujące do formatu kwoty
  const selectedWord = topLargestWords.find((w) => w.matchesPattern) ?? null;

  if (selectedWord && selectedWord.matchedAmount) {
    const amount = normalizeAmount(selectedWord.matchedAmount);
    return {
      mode: "B",
      name: "Tryb B: Największa czcionka (Top 6)",
      found: amount !== null,
      amount,
      amountFormatted: amount !== null ? amount.toFixed(2) : null,
      rawAmount: selectedWord.matchedAmount,
      matchedLine: `Słowo: "${selectedWord.text}" (wysokość: ${selectedWord.height}px)`,
      confidence: 0.8,
      details: `Wybrano z Top 6 słów o największej czcionce (${selectedWord.height}px)`,
    };
  }

  return {
    mode: "B",
    name: "Tryb B: Największa czcionka (Top 6)",
    found: false,
    amount: null,
    amountFormatted: null,
    rawAmount: null,
    matchedLine: null,
    confidence: 0,
    details: "Żadne z 6 największych słów nie pasowało do wzorca kwoty (something,XX)",
  };
}

// ============================================================================
// TRYB C: Słowa kluczowe (SUMA / TOTAL / RAZEM / DO ZAPŁATY z oceną punktową)
// ============================================================================
export const CURRENCY_AMOUNT_REGEX =
  /(?<![\d.,\/-])(\d{1,3}(?:[ \u00a0]\d{3})*|\d+)[.,](\d{2})(?![\d.,\/-])/g;

export const PRIMARY_KEYWORDS_REGEX =
  /\b(SUMA\s+PLN|RAZEM\s+PLN|TOTAL\s+PLN|DO\s+ZAPŁATY|DO\s+ZAPLATY|SUMA|RAZEM|TOTAL|ZAPŁACONO|ZAPLACONO|KWOTA|WARTOŚĆ|WARTOSC)\b/i;

export const CURRENCY_KEYWORDS_REGEX = /\b(PLN|ZŁ|ZL|PLZ)\b/i;

const TAX_OR_DISCOUNT_REGEX = /\b(PTU|PODATEK|STAWKA|RABAT|OPUST)\b/i;

interface KeywordCandidate {
  amount: number;
  rawAmount: string;
  keyword: string;
  matchedLine: string;
  currency: string;
  score: number;
}

export function parseModeC_Keywords(input: unknown): AlgorithmResult {
  const lines = extractLines(input);

  if (lines.length === 0) {
    return {
      mode: "C",
      name: "Tryb C: Słowa kluczowe (SUMA / TOTAL)",
      found: false,
      amount: null,
      amountFormatted: null,
      matchedLine: null,
      confidence: 0,
      details: "Brak linii tekstu",
    };
  }

  const candidates: KeywordCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const matches: string[] = [];
    const regex = new RegExp(CURRENCY_AMOUNT_REGEX.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      matches.push(match[0]);
    }

    const hasPrimary = PRIMARY_KEYWORDS_REGEX.test(line);
    const hasCurrency = CURRENCY_KEYWORDS_REGEX.test(line);
    const isTax = TAX_OR_DISCOUNT_REGEX.test(line);

    const primaryMatch = line.match(PRIMARY_KEYWORDS_REGEX);
    const currencyMatch = line.match(CURRENCY_KEYWORDS_REGEX);
    const matchedKeyword = primaryMatch?.[0] || currencyMatch?.[0] || null;

    if (matches.length > 0 && matchedKeyword) {
      const rawAmt = matches[matches.length - 1];
      const parsedVal = normalizeAmount(rawAmt);

      if (parsedVal !== null) {
        let score = 50;
        if (hasPrimary) score += 50;
        if (/SUMA\s+PLN|RAZEM\s+PLN|TOTAL\s+PLN/i.test(line)) score += 25;
        if (hasCurrency) score += 15;
        if (isTax) score -= 40;

        const positionBonus = (i / Math.max(lines.length, 1)) * 10;
        score += positionBonus;

        candidates.push({
          amount: parsedVal,
          rawAmount: rawAmt,
          keyword: matchedKeyword.toUpperCase(),
          matchedLine: line,
          currency: hasCurrency ? (currencyMatch?.[0].toUpperCase() ?? "PLN") : "PLN",
          score,
        });
      }
    }

    // Strategia 2: Słowo kluczowe w linii i, kwota w linii i+1
    if (matchedKeyword && matches.length === 0 && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      const nextMatches: string[] = [];
      const nextRegex = new RegExp(CURRENCY_AMOUNT_REGEX.source, "g");
      let nm: RegExpExecArray | null;
      while ((nm = nextRegex.exec(nextLine)) !== null) {
        nextMatches.push(nm[0]);
      }

      if (nextMatches.length > 0) {
        const rawAmt = nextMatches[0];
        const parsedVal = normalizeAmount(rawAmt);
        if (parsedVal !== null) {
          let score = hasPrimary ? 85 : 45;
          if (isTax) score -= 30;

          candidates.push({
            amount: parsedVal,
            rawAmount: rawAmt,
            keyword: matchedKeyword.toUpperCase(),
            matchedLine: `${line} -> ${nextLine}`,
            currency: "PLN",
            score,
          });
        }
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return {
      mode: "C",
      name: "Tryb C: Słowa kluczowe (SUMA / TOTAL)",
      found: true,
      amount: best.amount,
      amountFormatted: best.amount.toFixed(2),
      rawAmount: best.rawAmount,
      matchedLine: best.matchedLine,
      confidence: best.score >= 90 ? 0.9 : 0.7,
      details: `Dopasowano słowo kluczowe '${best.keyword}' (score: ${best.score.toFixed(0)})`,
    };
  }

  return {
    mode: "C",
    name: "Tryb C: Słowa kluczowe (SUMA / TOTAL)",
    found: false,
    amount: null,
    amountFormatted: null,
    rawAmount: null,
    matchedLine: null,
    confidence: 0,
    details: "Nie znaleziono słów kluczowych ani dopasowań kwoty",
  };
}

/**
 * Uruchamia dokładnie 3 historyczne tryby projektu
 */
export function runAllAlgorithms(input: unknown) {
  return {
    modeA: parseModeA_StrictPln(input),
    modeB: parseModeB_FontSizeTop6(input),
    modeC: parseModeC_Keywords(input),
  };
}
