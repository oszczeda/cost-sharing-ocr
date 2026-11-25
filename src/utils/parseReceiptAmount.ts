interface AlgorithmResult {
    mode: "C";
    name: string;
    found: boolean;
    amount: number | null;
    amountFormatted: string | null;
    rawAmount: string | null;
    matchedLine: string | null;
    confidence: number;
    details: string;
}

function extractLines(input: unknown): string[] {
    if (typeof input !== "string") return [];

    return input
        .split(/\r\n?|\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

function normalizeAmount(raw: string): number | null {
    const amount = Number(raw.replace(",", "."));
    return Number.isFinite(amount) ? amount : null;
}

export const CURRENCY_AMOUNT_REGEX =
    /(?<![\d.,\/-])(\d{1,3}(?:[ \u00a0]\d{3})+|\d{1,3}(?:\.\d{3})+(?=,)|\d+)[.,]\s?(\d{2})(?![\d.,\/-])/g;

export const STRONG_TOTAL_REGEX =
    /\b(S\s*U\s*M\s*A\s+P\s*L\s*N|R\s*A\s*Z\s*E\s*M\s+P\s*L\s*N|TOTAL\s+PLN|DO\s+ZAPLATY|WARTOSC\s+BRUTTO)\b/;

export const PRIMARY_KEYWORDS_REGEX =
    /\b(S\s*U\s*M\s*A|R\s*A\s*Z\s*E\s*M|TOTAL|ZAPLACONO|NALEZNOSC|LACZNIE|KWOTA|KARTA|BLIK)\b/;

export const CURRENCY_KEYWORDS_REGEX = /\b(P\s*L\s*N|ZL|PLZ)\b/;

const EXCLUDE_LINE_REGEX =
    /\b(PTU|VAT|PODATEK|STAWKA|NETTO|RABAT|OPUST|OSZCZEDZASZ|RESZTA|WYDANO|ZWROT|KAUCJA|NAZWA|ILOSC|CENA)\b/;

const TENDERED_CASH_REGEX = /\b(GOTOWKA|WPLATA)\b/;

interface KeywordCandidate {
    amount: number;
    rawAmount: string;
    keyword: string;
    matchedLine: string;
    currency: string;
    score: number;
}

function normalizeForMatching(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[łŁ]/g, "L")
        .toUpperCase();
}

function sanitizeRawAmount(raw: string): string {
    const compact = raw.replace(/[ \u00a0]+/g, "");
    if (compact.includes(",") && compact.includes(".")) {
        return compact.replace(/\./g, "");
    }
    return compact;
}

function extractAmounts(line: string): string[] {
    return line.match(CURRENCY_AMOUNT_REGEX) ?? [];
}

function calculateScore(params: {
    hasStrong: boolean;
    hasPrimary: boolean;
    hasCurrency: boolean;
    isTenderedCash: boolean;
    isMultiLine: boolean;
    amount: number;
    lineIndex: number;
    totalLines: number;
}): number {
    let score = 50;

    if (params.hasPrimary || params.hasStrong) score += 50;
    if (params.hasStrong) score += 25;
    if (params.hasCurrency) score += 15;
    if (params.isTenderedCash) score -= 25;
    if (params.isMultiLine) score -= 10;
    if (params.amount === 0) score -= 50;

    const positionBonus = (params.lineIndex / Math.max(params.totalLines, 1)) * 10;
    score += positionBonus;

    return score;
}

function calculateConfidence(candidates: KeywordCandidate[]): number {
    const best = candidates[0];
    const distinctRunnerUp = candidates.find((c) => c.amount !== best.amount);
    const margin = distinctRunnerUp ? best.score - distinctRunnerUp.score : 100;

    if (best.score >= 100 && margin >= 15) return 0.95;
    if (best.score >= 85 && margin >= 10) return 0.85;
    if (best.score >= 60) return 0.7;
    return 0.5;
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
            rawAmount: null,
            matchedLine: null,
            confidence: 0,
            details: "Brak linii tekstu",
        };
    }

    const candidates: KeywordCandidate[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const normalizedLine = normalizeForMatching(line);
        if (EXCLUDE_LINE_REGEX.test(normalizedLine)) continue;

        const matches = extractAmounts(line);

        const strongMatch = normalizedLine.match(STRONG_TOTAL_REGEX);
        const primaryMatch = normalizedLine.match(PRIMARY_KEYWORDS_REGEX);
        const currencyMatch = normalizedLine.match(CURRENCY_KEYWORDS_REGEX);
        const isTenderedCash = TENDERED_CASH_REGEX.test(normalizedLine);

        const matchedKeyword =
            strongMatch?.[0] || primaryMatch?.[0] || currencyMatch?.[0] || null;

        if (!matchedKeyword) continue;

        // Strategia 1: Słowo kluczowe i kwota w tej samej linii
        if (matches.length > 0) {
            const rawAmt = matches[matches.length - 1];
            const parsedVal = normalizeAmount(sanitizeRawAmount(rawAmt));

            if (parsedVal !== null && parsedVal >= 0) {
                const score = calculateScore({
                    hasStrong: Boolean(strongMatch),
                    hasPrimary: Boolean(primaryMatch),
                    hasCurrency: Boolean(currencyMatch),
                    isTenderedCash,
                    isMultiLine: false,
                    amount: parsedVal,
                    lineIndex: i,
                    totalLines: lines.length,
                });

                candidates.push({
                    amount: parsedVal,
                    rawAmount: rawAmt,
                    keyword: matchedKeyword.replace(/\s+/g, " "),
                    matchedLine: line,
                    currency: currencyMatch ? currencyMatch[0].replace(/\s+/g, "") : "PLN",
                    score,
                });
            }
            continue;
        }

        // Strategia 2: Słowo kluczowe w linii i, kwota w linii i+1
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (!nextLine) continue;

            const normalizedNextLine = normalizeForMatching(nextLine);
            if (EXCLUDE_LINE_REGEX.test(normalizedNextLine)) continue;

            const nextMatches = extractAmounts(nextLine);
            if (nextMatches.length === 0) continue;

            const rawAmt = nextMatches[nextMatches.length - 1];
            const parsedVal = normalizeAmount(sanitizeRawAmount(rawAmt));

            if (parsedVal !== null && parsedVal >= 0) {
                const nextCurrencyMatch = normalizedNextLine.match(CURRENCY_KEYWORDS_REGEX);
                const resolvedCurrency = currencyMatch?.[0] || nextCurrencyMatch?.[0];

                const score = calculateScore({
                    hasStrong: Boolean(strongMatch),
                    hasPrimary: Boolean(primaryMatch),
                    hasCurrency: Boolean(resolvedCurrency),
                    isTenderedCash: isTenderedCash || TENDERED_CASH_REGEX.test(normalizedNextLine),
                    isMultiLine: true,
                    amount: parsedVal,
                    lineIndex: i,
                    totalLines: lines.length,
                });

                candidates.push({
                    amount: parsedVal,
                    rawAmount: rawAmt,
                    keyword: matchedKeyword.replace(/\s+/g, " "),
                    matchedLine: `${line} -> ${nextLine}`,
                    currency: resolvedCurrency ? resolvedCurrency.replace(/\s+/g, "") : "PLN",
                    score,
                });
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
            confidence: calculateConfidence(candidates),
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