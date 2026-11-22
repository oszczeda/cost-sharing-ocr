/**
 * Narzędzie do parsowania odpowiedzi OCR (Google Cloud Vision API)
 *
 * Wybrany w benchmarku domyślny algorytm produkcyjny:
 * TRYB C: Słowa kluczowe (SUMA / TOTAL / RAZEM / DO ZAPŁATY z systemem wag i strategią sąsiednich linii).
 * Skuteczność w benchmarku 20 paragonów: 85.0%.
 */

import {
  parseModeC_Keywords,
  normalizeAmount as normAmount,
  extractLines,
  TextAnnotationItem,
} from "./receipt-algorithms";

export { TextAnnotationItem, normalizeAmount } from "./receipt-algorithms";

export interface ParsedExpense {
  /** Czy odnaleziono kwotę */
  found: boolean;
  /** Liczbowy format kwoty (np. 19.89) lub null */
  amount: number | null;
  /** Sformatowana kwota numeryczna z kropką (np. "19.89") lub null */
  amountFormatted: string | null;
  /** Oryginalny ciąg znaków kwoty z paragonu (np. "19,89") lub null */
  rawAmount: string | null;
  /** Cały dopasowany wiersz */
  matchedLine: string | null;
  /** Poziom pewności dopasowania */
  confidence?: number;
  /** Słowo kluczowe / szczegóły */
  details?: string;
}

/**
 * Wyciąga linie tekstu z odpowiedzi OCR
 */
export function extractLinesFromOcrInput(input: unknown): string[] {
  return extractLines(input);
}

/**
 * Główna funkcja parsowania wykorzystywana w aplikacji:
 * Uruchamia Tryb C (Słowa kluczowe).
 */
export function parseReceiptExpense(input: unknown): ParsedExpense {
  const result = parseModeC_Keywords(input);

  return {
    found: result.found,
    amount: result.amount,
    amountFormatted: result.amountFormatted,
    rawAmount:
      result.rawAmount ??
      (result.amount !== null ? result.amount.toFixed(2) : null),
    matchedLine: result.matchedLine,
    confidence: result.confidence,
    details: result.details,
  };
}
