import CreateGroupButton from "@/components/CreateGroupButton";
import InviteCodeButton from "@/components/InviteCodeButton";
import JoinGroupButton from "@/components/JoinGroupButton";
import LoadingScreen from "@/components/LoadingScreen";
import NicknameForm from "@/components/NicknameForm";
import OcrScanButton, { OcrResult } from "@/components/OCR-ScanButton";
import { useUserProfile } from "@/hooks/use-user-profile";
import { parseModeC_Keywords } from "@/utils/parseReceiptAmount";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

export default function HomeScreen() {
  const { loading, userId, nickname, saveNickname } = useUserProfile();

  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [receiptAmount, setReceiptAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const handleOcrResult = (result: OcrResult) => {
    const parsed = parseModeC_Keywords(result.rawText);

    setOcrResult(result);
    setReceiptAmount(parsed.amountFormatted?.replace(".", ",") ?? "");
    setError(
      parsed.found
        ? null
        : "Nie znaleziono sumy na paragonie. Wpisz kwotę ręcznie.",
    );
  };

  if (loading) {
    return <LoadingScreen message="Inicjalizacja tożsamości..." />;
  }

  if (!nickname) {
    return <NicknameForm onSave={saveNickname} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👋 Cześć, {nickname}!</Text>
      <Text style={styles.subtitle}>Twoje ID: {userId?.slice(0, 8)}...</Text>

      <View style={styles.amountField}>
        <Text>Kwota z paragonu (zł)</Text>
        <TextInput
          style={styles.amountInput}
          accessibilityLabel="Kwota z paragonu w złotych"
          value={receiptAmount}
          onChangeText={setReceiptAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />
      </View>

      <OcrScanButton
        onResult={handleOcrResult}
        onError={(err: Error) => setError(err.message)}
      />
      <CreateGroupButton />
      <JoinGroupButton />
      <InviteCodeButton />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ Błąd: {error}</Text>
        </View>
      )}

      {ocrResult && (
        <ScrollView
          style={styles.resultBox}
          contentContainerStyle={styles.resultContent}
        >
          <Text style={styles.resultLabel}>✅ Wynik OCR:</Text>
          <Text style={styles.resultText}>
            {ocrResult.rawText || "(brak tekstu)"}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  amountField: {
    width: "100%",
    gap: 4,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#888",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
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
    maxHeight: 280,
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