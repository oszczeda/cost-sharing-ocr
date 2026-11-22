import fs from "node:fs";
import path from "node:path";

// 1. Wczytanie zmiennych z .env (bez dodatkowych zależności)
function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const VISION_API_KEY =
  process.env.EXPO_PUBLIC_VISION_API_KEY || env.EXPO_PUBLIC_VISION_API_KEY;

if (!VISION_API_KEY) {
  console.error("❌ BŁĄD: Brak klucza EXPO_PUBLIC_VISION_API_KEY w pliku .env!");
  process.exit(1);
}

const INPUT_DIR = path.resolve(process.cwd(), "receipts_input");
const FIXTURES_DIR = path.resolve(process.cwd(), "src/fixtures");
const OUTPUT_FILE = path.join(FIXTURES_DIR, "receipts-benchmark.json");
const GROUND_TRUTH_FILE = path.join(FIXTURES_DIR, "ground-truth.json");

interface BenchmarkReceipt {
  id: string;
  filename: string;
  expectedAmount: number | null;
  capturedAt: string;
  rawText: string;
  lines: string[];
  rawResponse: any;
}

function parseAmountFromFilename(filename: string): number | null {
  // Szuka wzorca np. 19.89, 19,89, 120.00
  const match = filename.match(/(\d+[.,]\d{2})/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  return isNaN(num) ? null : num;
}

async function runVisionApi(imageBuffer: Buffer): Promise<any> {
  const base64 = imageBuffer.toString("base64");
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Vision API error ${res.status}: ${json.error?.message ?? JSON.stringify(json)}`
    );
  }
  return json;
}

async function main() {
  console.log("📸 --- OCR CAPTURE RUNNER ---");

  if (!fs.existsSync(INPUT_DIR)) {
    fs.mkdirSync(INPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  // Wczytaj ground truth jeśli istnieje
  let groundTruthMap: Record<string, number> = {};
  if (fs.existsSync(GROUND_TRUTH_FILE)) {
    try {
      groundTruthMap = JSON.parse(fs.readFileSync(GROUND_TRUTH_FILE, "utf-8"));
    } catch {
      // ignore
    }
  }

  // Wczytaj istniejące wyniki benchmarku (cache)
  let existingBenchmark: BenchmarkReceipt[] = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingBenchmark = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      console.log(`📦 Wczytano ${existingBenchmark.length} wcześniej zapisanych paragonów z cache.`);
    } catch {
      existingBenchmark = [];
    }
  }

  const existingMap = new Map<string, BenchmarkReceipt>(
    existingBenchmark.map((r) => [r.filename, r])
  );

  // Pobierz listę plików ze zdjęciami
  const validExts = [".jpg", ".jpeg", ".png", ".webp"];
  const allFiles = fs.readdirSync(INPUT_DIR);
  const imageFiles = allFiles.filter((f: string) =>
    validExts.includes(path.extname(f).toLowerCase())
  );

  if (imageFiles.length === 0) {
    console.log(`\n⚠️  Nie znaleziono żadnych zdjęć w folderze: receipts_input/`);
    console.log(`👉 Wrzuć swoje zdjęcia paragonów (jpg, png) do folderu:`);
    console.log(`   ${INPUT_DIR}`);
    console.log(`\n💡 WSKAZÓWKA: Możesz nazwać pliki podając oczekiwaną kwotę, np:`);
    console.log(`   - 19.89_biedronka.jpg`);
    console.log(`   - 45,50_lidl.png`);
    console.log(`   Wtedy skrypt automatycznie ustawi oczekiwaną kwotę do testów!\n`);
    return;
  }

  console.log(`🔍 Znaleziono ${imageFiles.length} zdjęć w ${INPUT_DIR}.\n`);

  let newScansCount = 0;
  const updatedList: BenchmarkReceipt[] = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const prefix = `[${i + 1}/${imageFiles.length}] ${filename}`;

    // Ustal oczekiwaną kwotę (z nazwy pliku, z pliku ground-truth, lub z cache)
    const amountFromFilename = parseAmountFromFilename(filename);
    const amountFromGroundTruth = groundTruthMap[filename];

    const cached = existingMap.get(filename);

    if (cached) {
      const finalExpected =
        amountFromFilename ?? amountFromGroundTruth ?? cached.expectedAmount;
      cached.expectedAmount = finalExpected;
      updatedList.push(cached);
      console.log(`⚡ ${prefix} -> Z pamięci podręcznej (oczekiwana: ${finalExpected ?? "brak"} zł)`);
      continue;
    }

    // Nowy plik do zeskanowania przez Google Cloud Vision API
    console.log(`🌐 ${prefix} -> Wysyłanie do Google Cloud Vision API...`);
    const filePath = path.join(INPUT_DIR, filename);
    const buffer = fs.readFileSync(filePath);

    try {
      const responseJson = await runVisionApi(buffer);
      const res0 = responseJson.responses?.[0];

      const rawText: string =
        res0?.fullTextAnnotation?.text ??
        res0?.textAnnotations?.[0]?.description ??
        "";

      const lines = rawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const finalExpected = amountFromFilename ?? amountFromGroundTruth ?? null;

      const record: BenchmarkReceipt = {
        id: filename,
        filename,
        expectedAmount: finalExpected,
        capturedAt: new Date().toISOString(),
        rawText,
        lines,
        rawResponse: responseJson,
      };

      updatedList.push(record);
      newScansCount++;
      console.log(`✅ ${prefix} -> Zeskanowano! Oczekiwana: ${finalExpected ?? "nieustawiona"} zł (${lines.length} linii tekstu)`);

      // Mała pauza, aby nie przekroczyć limitu zapytań (rate limit)
      await new Promise((r) => setTimeout(r, 400));
    } catch (err: any) {
      console.error(`❌ ${prefix} -> Błąd Vision API: ${err.message}`);
    }
  }

  // Zapisz do pliku JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedList, null, 2), "utf-8");

  console.log("\n========================================================");
  console.log(`🎉 Zakończono! Łącznie w bazie: ${updatedList.length} paragonów.`);
  if (newScansCount > 0) {
    console.log(`✨ Nowych zapytań do API: ${newScansCount}`);
  }
  console.log(`📁 Wyniki OCR zapisane w: src/fixtures/receipts-benchmark.json`);

  const missingExpected = updatedList.filter((r) => r.expectedAmount === null);
  if (missingExpected.length > 0) {
    console.log(
      `\n⚠️  ${missingExpected.length} paragonów nie ma ustawionej oczekiwanej kwoty!`
    );
    console.log(
      `   Możesz wpisać oczekiwane kwoty ręcznie w: src/fixtures/receipts-benchmark.json`
    );
    console.log(
      `   albo zmienić nazwy plików (np. "19.89_biedronka.jpg") i uruchomić skrypt ponownie.`
    );
  }

  console.log(`\n🚀 Aby przetestować 3 algorytmy na tych danych, uruchom:`);
  console.log(`   npm run test:receipts\n`);
}

main().catch((err) => {
  console.error("Nieoczekiwany błąd:", err);
  process.exit(1);
});
