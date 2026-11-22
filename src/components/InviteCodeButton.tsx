import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

export default function InviteCodeButton() {
  const handlePress = () => {
    router.push("/invite-code");
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      onPress={handlePress}
    >
      <Text style={styles.buttonText}>📢 Pokaż kod zaproszenia</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#f57c00",
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