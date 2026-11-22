import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type GroupItem = {
  id: string;
  name: string;
  invite_code: string;
};

export default function InviteCodeScreen() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyGroups();
  }, []);

  const fetchMyGroups = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("group_members")
        .select(`
          group:groups (
            id,
            name,
            invite_code
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const formattedGroups: GroupItem[] = (data || [])
        .map((item: any) => item.group)
        .filter(Boolean);

      setGroups(formattedGroups);
    } catch (err: any) {
      console.error("Błąd pobierania grup:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f57c00" />
        <Text style={{ marginTop: 12 }}>Ładowanie Twoich grup...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📢 Kody Twoich grup</Text>
      <Text style={styles.subtitle}>
        Podaj ten kod znajomemu, aby mógł dołączyć do grupy:
      </Text>

      {groups.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Nie należysz jeszcze do żadnej grupy.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          style={{ width: "100%" }}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.codeLabel}>Kod zaproszenia:</Text>
              <Text style={styles.codeText}>{item.invite_code}</Text>
            </View>
          )}
        />
      )}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Wróć</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 60,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  emptyBox: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
  card: {
    backgroundColor: "#fff3e0",
    borderWidth: 1,
    borderColor: "#ffe0b2",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  groupName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  codeLabel: {
    fontSize: 12,
    color: "#666",
  },
  codeText: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 4,
    color: "#e65100",
    marginTop: 4,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginTop: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: "#333",
  },
});