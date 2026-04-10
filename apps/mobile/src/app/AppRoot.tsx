import { StatusBar } from "expo-status-bar";
import { I18nManager, StyleSheet, Text, View } from "react-native";

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
}

export default function AppRoot() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ברוכים הבאים ל-Handil</Text>
      <Text style={styles.subtitle}>מחברים בין דיירים חדשים לבעלי מקצוע בתל אביב</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "right",
    color: "#111827",
    marginBottom: 12
  },
  subtitle: {
    fontSize: 16,
    textAlign: "right",
    color: "#4B5563"
  }
});
