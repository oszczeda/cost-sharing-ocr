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

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars.charAt(randomIndex);
  }
  return code;
}

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert("Błąd", "Podaj nazwę grupy.");
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

      const inviteCode = generateInviteCode();

      const { data: newGroup, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: trimmedName,
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: newGroup.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      Alert.alert(
        "Sukces! 🎉",
        `Grupa "${trimmedName}" została utworzona!\nKod zaproszenia: ${inviteCode}`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      console.error("Błąd tworzenia grupy:", err);
      Alert.alert("Błąd", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏠 Nowa grupa</Text>
      <Text style={styles.subtitle}>
        Wpisz nazwę grupy rozliczeniowej. Po utworzeniu otrzymasz kod zaproszenia dla znajomych.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="np. Mieszkanie Mickiewicza albo Wyjazd Tatry"
        value={groupName}
        onChangeText={setGroupName}
      />

      <Pressable
        style={({ pressed }) => [styles.createButton, pressed && styles.buttonPressed]}
        onPress={handleCreateGroup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Utwórz grupę</Text>
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
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  createButton: {
    backgroundColor: "#2e7d32",
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