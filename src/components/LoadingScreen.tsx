import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type Props = {
  message?: string;
};

export default function LoadingScreen({ message = "Ładowanie..." }: Props) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6200ea" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 12,
    fontSize: 15,
    color: "#555",
  },
});