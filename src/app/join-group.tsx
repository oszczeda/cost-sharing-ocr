import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function JoinGroupScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoinGroup = async () => {
    const cleanCode = inviteCode.trim().toUpperCase();

    if (cleanCode.length !== 8) {
      Alert.alert("Błąd", "Kod zaproszenia musi mieć dokładnie 8 znaków.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Brak aktywnej sesji użytkownika.");
      }

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("id, name")
        .eq("invite_code", cleanCode)
        .maybeSingle();

      if (groupError) throw groupError;

      if (!group) {
        Alert.alert("Nie znaleziono", "Grupa o takim kodzie nie istnieje.");
        return;
      }

      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        Alert.alert("Informacja", `Już należysz do grupy "${group.name}".`);
        router.back();
        return;
      }

      const { error: joinError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
      });

      if (joinError) throw joinError;

      Alert.alert("Sukces! 🎉", `Dołączono do grupy "${group.name}"!`, [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      console.error("Błąd dołączania do grupy:", err);
      Alert.alert("Błąd", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔗 Dołącz do grupy</Text>
      <Text style={styles.subtitle}>
        Wpisz 8-znakowy kod zaproszenia, który otrzymałeś od znajomego:
      </Text>

      <TextInput
        style={styles.input}
        placeholder="np. X9K2PL8Q"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        maxLength={8}
      />

      <Pressable
        style={({ pressed }) => [styles.joinButton, pressed && styles.buttonPressed]}
        onPress={handleJoinGroup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Dołącz</Text>
        )}
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Anuluj</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 14,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
    backgroundColor: "#fafafa",
  },
  joinButton: {
    backgroundColor: "#0288d1",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    color: "#888",
    fontSize: 15,
  },
});