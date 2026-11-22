import fs from "node:fs";
import path from "node:path";
import { runAllAlgorithms } from "../src/utils/receipt-algorithms";

const FIXTURES_DIR = path.resolve(process.cwd(), "src/fixtures");
const BENCHMARK_FILE = path.join(FIXTURES_DIR, "receipts-benchmark.json");

interface BenchmarkReceipt {
  id: string;
  filename: string;
  expectedAmount: number | null;
  rawText: string;
  lines: string[];
}

function formatCurrency(val: number | null): string {
  if (val === null) return "  ---  ";
  return `${val.toFixed(2)} zł`.padStart(9);
}

function isMatch(detected: number | null, expected: number | null): boolean {
  if (detected === null || expected === null) return false;
  return Math.abs(detected - expected) < 0.02;
}

function main() {
  console.log("\n==========================================================================");
  console.log("   📊 BENCHMARK TRZECH HISTORYCZNYCH TRYBÓW PROJEKTU (OCR)");
  console.log("   - Tryb A: Tylko PLN <kwota> (rygorystyczny)");
  console.log("   - Tryb B: Największa czcionka (Top 6 słów z BoundingBox)");
  console.log("   - Tryb C: Słowa kluczowe (SUMA / TOTAL / RAZEM z punktacją)");
  console.log("==========================================================================\n");

  if (!fs.existsSync(BENCHMARK_FILE)) {
    console.error(`❌ Nie znaleziono pliku: ${BENCHMARK_FILE}`);
    console.log(`\nNajpierw wrzuć zdjęcia do folderu receipts_input/ i uruchom:`);
    console.log(`   npm run ocr:capture\n`);
    process.exit(1);
  }

  const data: BenchmarkReceipt[] = JSON.parse(
    fs.readFileSync(BENCHMARK_FILE, "utf-8")
  );

  if (data.length === 0) {
    console.log(`⚠️  Plik ${BENCHMARK_FILE} jest pusty. Zeskanuj najpierw paragony!`);
    return;
  }

  console.log(`Załadowano ${data.length} paragonów testowych z bazy fixtures.\n`);

  let countWithGroundTruth = 0;
  let modeASuccess = 0;
  let modeBSuccess = 0;
  let modeCSuccess = 0;

  // Nagłówek tabeli
  console.log(
    "| #  | Plik / Paragon             | Oczekiwana | Tryb A (Tylko PLN) | Tryb B (Czcionka Top 6) | Tryb C (Słowa kluczowe) |"
  );
  console.log(
    "|:---|:---------------------------|:-----------|:-------------------|:------------------------|:------------------------|"
  );

  data.forEach((item, index) => {
    const results = runAllAlgorithms(item);
    const expected = item.expectedAmount;
    const hasTruth = expected !== null;

    if (hasTruth) {
      countWithGroundTruth++;
    }

    const matchA = isMatch(results.modeA.amount, expected);
    const matchB = isMatch(results.modeB.amount, expected);
    const matchC = isMatch(results.modeC.amount, expected);

    if (matchA) modeASuccess++;
    if (matchB) modeBSuccess++;
    if (matchC) modeCSuccess++;

    const iconA = !hasTruth ? "❓" : matchA ? "✅" : "❌";
    const iconB = !hasTruth ? "❓" : matchB ? "✅" : "❌";
    const iconC = !hasTruth ? "❓" : matchC ? "✅" : "❌";

    const nameCol = item.filename.slice(0, 25).padEnd(25);
    const expCol = formatCurrency(expected);
    const colA = `${iconA} ${formatCurrency(results.modeA.amount)}`;
    const colB = `${iconB} ${formatCurrency(results.modeB.amount)}`;
    const colC = `${iconC} ${formatCurrency(results.modeC.amount)}`;

    const numStr = (index + 1).toString().padStart(2);
    console.log(`| ${numStr} | ${nameCol} | ${expCol} | ${colA.padEnd(18)} | ${colB.padEnd(22)} | ${colC.padEnd(22)} |`);
  });

  console.log("\n==========================================================================");
  console.log("   📈 PODSUMOWANIE SKUTECZNOŚCI");
  console.log("==========================================================================");

  if (countWithGroundTruth === 0) {
    console.log(
      "\n⚠️  Żaden z paragonów nie miał zdefiniowanej wartości oczekiwanej (expectedAmount)."
    );
    console.log(
      "   Uzupełnij oczekiwane kwoty w src/fixtures/receipts-benchmark.json lub nazwach plików!"
    );
    return;
  }

  const pA = ((modeASuccess / countWithGroundTruth) * 100).toFixed(1);
  const pB = ((modeBSuccess / countWithGroundTruth) * 100).toFixed(1);
  const pC = ((modeCSuccess / countWithGroundTruth) * 100).toFixed(1);

  console.log(`Przetestowano paragonów z wartością wzorcową: ${countWithGroundTruth}`);
  console.log(`1. Tryb A (Tylko PLN <kwota>):        ${modeASuccess}/${countWithGroundTruth} (${pA}%)`);
  console.log(`2. Tryb B (Największa czcionka Top 6): ${modeBSuccess}/${countWithGroundTruth} (${pB}%)`);
  console.log(`3. Tryb C (Słowa kluczowe SUMA/TOTAL): ${modeCSuccess}/${countWithGroundTruth} (${pC}%)`);

  // Wskazanie zwycięzcy
  const maxSuccess = Math.max(modeASuccess, modeBSuccess, modeCSuccess);
  const winners: string[] = [];
  if (maxSuccess === modeCSuccess) winners.push("Tryb C (Słowa kluczowe)");
  if (maxSuccess === modeBSuccess) winners.push("Tryb B (Największa czcionka)");
  if (maxSuccess === modeASuccess) winners.push("Tryb A (Tylko PLN)");

  console.log(`\n🏆 ZWYCIĘZCA BENCHMARKU: ${winners.join(" oraz ")}`);

  // Tabela gotowa do wklejenia do dokumentacji
  console.log("\n📋 --- TABELA DO DOKUMENTACJI / PREZENTACJI NA ZALICZENIE (Markdown) ---");
  console.log("```markdown");
  console.log("| Tryb | Opis podejścia | Poprawne detekcje | Skuteczność [%] |");
  console.log("|:---|:---|:---:|:---:|");
  console.log(`| **Tryb A** | Tylko 'PLN <kwota>' (rygorystyczny regex z lewej strony) | ${modeASuccess}/${countWithGroundTruth} | **${pA}%** |`);
  console.log(`| **Tryb B** | Największa czcionka (Top 6 słów z geometrii BoundingBox Vision API) | ${modeBSuccess}/${countWithGroundTruth} | **${pB}%** |`);
  console.log(`| **Tryb C** | Słowa kluczowe (SUMA/TOTAL/RAZEM z systemem wag i sąsiednich linii) | ${modeCSuccess}/${countWithGroundTruth} | **${pC}%** |`);
  console.log("```\n");
}

main();
