import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export function useUserProfile() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      setLoading(true);

      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }

      if (!session?.user) {
        throw new Error("Nie udało się pobrać tożsamości użytkownika.");
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", currentUserId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.nickname) {
        setNickname(profile.nickname);
      }
    } catch (err: any) {
      console.error("Błąd autoryzacji:", err);
      Alert.alert("Błąd profilu", err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveNickname = async (newNickname: string) => {
    const trimmed = newNickname.trim();
    if (!trimmed) {
      Alert.alert("Błąd", "Wpisz swój pseudonim.");
      return false;
    }

    if (!userId) return false;

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        nickname: trimmed,
      });

      if (error) throw error;

      setNickname(trimmed);
      return true;
    } catch (err: any) {
      Alert.alert("Błąd zapisu", err.message);
      return false;
    }
  };

  return {
    loading,
    userId,
    nickname,
    saveNickname,
  };
}