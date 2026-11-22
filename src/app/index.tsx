import CreateGroupButton from "@/components/CreateGroupButton";
import InviteCodeButton from "@/components/InviteCodeButton";
import JoinGroupButton from "@/components/JoinGroupButton";
import LoadingScreen from "@/components/LoadingScreen";
import NicknameForm from "@/components/NicknameForm";
import OcrScanButton, { OcrResult } from "@/components/OCR-ScanButton";
import { useUserProfile } from "@/hooks/use-user-profile";
import { parseReceiptExpense, ParsedExpense } from "@/utils/receipt-parser";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { loading, userId, nickname, saveNickname } = useUserProfile();

  // Stan formularza wydatku
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseTitle, setExpenseTitle] = useState<string>("Zakupy - paragon");
  const [expenseCategory, setExpenseCategory] = useState<string>("Jedzenie i zakupy");

  // Stan OCR i parsowania
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [parsedExpense, setParsedExpense] = useState<ParsedExpense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawDetails, setShowRawDetails] = useState<boolean>(false);

  /**
   * Obsługa odpowiedzi z OCR
   * Uruchamia Tryb C (Wyszukiwanie słów kluczowych: SUMA / TOTAL / RAZEM).
   * Jeśli nie znajdzie — użytkownik wprowadza kwotę ręcznie.
   */
  const handleOcrResult = (result: OcrResult) => {
    setError(null);
    setOcrResult(result);
    setParsedExpense(result.parsedExpense);

    if (result.parsedExpense?.found && result.parsedExpense.rawAmount) {
      setExpenseAmount(result.parsedExpense.rawAmount);
    } else {
      // Nie zgadujemy na siłę — pole kwoty pozostaje do wprowadzenia przez użytkownika
      setExpenseAmount("");
    }
  };

  const handleSaveExpense = () => {
    if (!expenseAmount.trim()) {
      Alert.alert("Brak kwoty", "Wprowadź lub zeskanuj kwotę wydatku.");
      return;
    }
    Alert.alert(
      "Zapisano wydatek! 💰",
      `Tytuł: ${expenseTitle}\nKwota: ${expenseAmount} PLN\nKategoria: ${expenseCategory}`
    );
  };

  const handleClear = () => {
    setExpenseAmount("");
    setExpenseTitle("Zakupy - paragon");
    setOcrResult(null);
    setParsedExpense(null);
    setError(null);
  };

  if (loading) {
    return <LoadingScreen message="Inicjalizacja tożsamości..." />;
  }

  if (!nickname) {
    return <NicknameForm onSave={saveNickname} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ============================================================== */}
          {/* PROFIL UŻYTKOWNIKA                                             */}
          {/* ============================================================== */}
          <View style={styles.userProfileCard}>
            <Text style={styles.greetingTitle}>👋 Cześć, {nickname}!</Text>
            <Text style={styles.subtitle}>Twoje ID: {userId?.slice(0, 8)}...</Text>
          </View>

          {/* ============================================================== */}
          {/* ZARZĄDZANIE GRUPAMI                                            */}
          {/* ============================================================== */}
          <View style={styles.groupsCard}>
            <Text style={styles.sectionHeader}>👥 Grupy i rozliczenia</Text>
            <View style={styles.groupButtonsWrapper}>
              <CreateGroupButton />
              <JoinGroupButton />
              <InviteCodeButton />
            </View>
          </View>

          {/* ============================================================== */}
          {/* OKNO: Wydatek                                                  */}
          {/* ============================================================== */}
          <View style={styles.expenseWindow}>
            <View style={styles.windowHeaderRow}>
              <Text style={styles.windowTitle}>🧾 Nowy wydatek:</Text>
              {parsedExpense?.found && (
                <View style={styles.autoDetectedBadge}>
                  <Text style={styles.autoDetectedBadgeText}>✨ OCR Wykryto</Text>
                </View>
              )}
            </View>

            {/* Informacja o wykryciu sumy */}
            {parsedExpense?.found && (
              <View style={styles.matchBanner}>
                <Text style={styles.matchBannerTitle}>
                  ✅ Wykryto sumę z paragonu:
                </Text>
                <Text style={styles.matchBannerText}>
                  Wykryta kwota:{" "}
                  <Text style={styles.boldText}>{parsedExpense.rawAmount} PLN</Text>
                </Text>
                {parsedExpense.matchedLine && (
                  <Text style={styles.matchBannerSub}>
                    Dopasowanie: "{parsedExpense.matchedLine}"
                  </Text>
                )}
              </View>
            )}

            {/* Informacja, gdy nie odnaleziono kwoty — brak zgadywania */}
            {ocrResult && !parsedExpense?.found && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningBannerTitle}>
                  ℹ️ Nie odnaleziono kwoty
                </Text>
                <Text style={styles.warningBannerText}>
                  Nie udało się jednoznacznie odczytać sumy końcowej z paragonu (brak słów kluczowych SUMA / TOTAL / RAZEM). Wprowadź kwotę ręcznie poniżej.
                </Text>
              </View>
            )}

            {/* Pole kwoty wydatku */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Kwota (PLN):</Text>
              <View style={styles.amountInputContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                  placeholder="0,00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                <Text style={styles.currencyBadge}>PLN</Text>
              </View>
            </View>

            {/* Dodatkowe pola wydatku */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tytuł wydatku:</Text>
              <TextInput
                style={styles.textInput}
                value={expenseTitle}
                onChangeText={setExpenseTitle}
                placeholder="np. Biedronka - zakupy"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Kategoria:</Text>
              <TextInput
                style={styles.textInput}
                value={expenseCategory}
                onChangeText={setExpenseCategory}
                placeholder="Kategoria"
                placeholderTextColor="#999"
              />
            </View>

            {/* Przyciski akcji okna Wydatek */}
            <View style={styles.windowActionsRow}>
              <Pressable
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={handleSaveExpense}
              >
                <Text style={styles.saveBtnText}>💾 Zapisz wydatek</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.clearBtn]}
                onPress={handleClear}
              >
                <Text style={styles.clearBtnText}>Wyczyść</Text>
              </Pressable>
            </View>
          </View>

          {/* ============================================================== */}
          {/* SEKCJA: Skanowanie OCR (Kamera / Galeria)                       */}
          {/* ============================================================== */}
          <View style={styles.scanSection}>
            <Text style={styles.sectionSubtitle}>
              Zeskanuj paragon aparatem lub wybierz z galerii:
            </Text>

            <OcrScanButton
              onResult={handleOcrResult}
              onError={(err: Error) => setError(err.message)}
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>❌ Błąd OCR: {error}</Text>
              </View>
            )}
          </View>

          {/* ============================================================== */}
          {/* SEKCJA: Podgląd surowego tekstu z podziałem na wiersze OCR     */}
          {/* ============================================================== */}
          {ocrResult && (
            <View style={styles.rawSection}>
              <Pressable
                style={styles.toggleRawHeader}
                onPress={() => setShowRawDetails(!showRawDetails)}
              >
                <Text style={styles.toggleRawText}>
                  {showRawDetails ? "▼ Ukryj tekst OCR" : "▶ Pokaż wiersze z OCR"}
                </Text>
              </Pressable>

              {showRawDetails && (
                <View style={styles.rawDetailsBox}>
                  <Text style={styles.rawDetailsHeader}>
                    Odczytany tekst (podział wierszy wg znaczników OCR):
                  </Text>
                  <Text style={styles.rawTextContent}>
                    {ocrResult.rawText || "(brak tekstu)"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f7f9",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },

  /* Profil użytkownika */
  userProfileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e9f1",
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a24",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },

  /* Zarządzanie grupami */
  groupsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8e9f1",
    gap: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a24",
  },
  groupButtonsWrapper: {
    gap: 10,
  },

  /* Okno Wydatek */
  expenseWindow: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e8e9f1",
    gap: 14,
  },
  windowHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  windowTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a24",
  },
  autoDetectedBadge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  autoDetectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2e7d32",
  },

  /* Banery informacyjne */
  matchBanner: {
    backgroundColor: "#e8f5e9",
    borderWidth: 1,
    borderColor: "#a5d6a7",
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  matchBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2e7d32",
  },
  matchBannerText: {
    fontSize: 13,
    color: "#1b5e20",
  },
  matchBannerSub: {
    fontSize: 12,
    color: "#388e3c",
    fontStyle: "italic",
  },
  warningBanner: {
    backgroundColor: "#fff8e1",
    borderWidth: 1,
    borderColor: "#ffe082",
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  warningBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b78103",
  },
  warningBannerText: {
    fontSize: 12,
    color: "#795548",
    lineHeight: 18,
  },
  boldText: {
    fontWeight: "700",
  },

  /* Formularz */
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444455",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f5f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9dbe9",
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  currencyBadge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginLeft: 8,
  },
  textInput: {
    height: 44,
    backgroundColor: "#f4f5f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9dbe9",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111",
  },
  windowActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtn: {
    backgroundColor: "#6200ea",
  },
  saveBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  clearBtn: {
    backgroundColor: "#eceff1",
  },
  clearBtnText: {
    color: "#555555",
    fontWeight: "600",
    fontSize: 14,
  },

  /* Sekcja skanowania */
  scanSection: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "#fdecea",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    borderWidth: 1,
    borderColor: "#ef9a9a",
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
  },

  /* Sekcja surowego wyniku */
  rawSection: {
    marginTop: 4,
  },
  toggleRawHeader: {
    paddingVertical: 6,
  },
  toggleRawText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6200ea",
  },
  rawDetailsBox: {
    backgroundColor: "#f4f4f6",
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    gap: 6,
  },
  rawDetailsHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },
  rawTextContent: {
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
