import OcrScanButton, { OcrResult } from "@/components/OCR-ScanButton";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOcrResult = (result: OcrResult) => {
    setError(null);
    setOcrResult(result);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📄 Skaner paragonów</Text>

      <OcrScanButton
        onResult={handleOcrResult}
        onError={(err: Error) => setError(err.message)}
      />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ Błąd: {error}</Text>
        </View>
      )}

      {ocrResult && (
        <ScrollView style={styles.resultBox} contentContainerStyle={styles.resultContent}>
          <Text style={styles.resultLabel}>✅ Wynik OCR:</Text>
          <Text style={styles.resultText}>{ocrResult.rawText || "(brak tekstu)"}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "#fdecea",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
  },
  resultBox: {
    width: "100%",
    maxHeight: 320,
    backgroundColor: "#f4f4f4",
    borderRadius: 8,
    padding: 12,
  },
  resultContent: {
    gap: 8,
  },
  resultLabel: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
});