import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

export default function JoinGroupButton() {
  const handlePress = () => {
    router.push("/join-group");
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={handlePress}
    >
      <Text style={styles.buttonText}>🔗 Dołącz do grupy</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0288d1",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
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
});