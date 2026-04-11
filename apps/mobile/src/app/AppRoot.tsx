import axios from "axios";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, I18nManager, StyleSheet, Text, View } from "react-native";

import { API_BASE_URL } from "../services/apiClient";
import { fetchHealth } from "../services/healthApi";

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
}

type HealthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; service: string }
  | { kind: "error"; message: string };

export default function AppRoot() {
  const [health, setHealth] = useState<HealthState>({ kind: "idle" });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setHealth({ kind: "loading" });

    fetchHealth(controller.signal)
      .then((data) => {
        if (!active) return;
        setHealth({ kind: "ok", service: data.service });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (axios.isCancel(error)) return;
        const message =
          axios.isAxiosError(error) && error.message
            ? error.message
            : "שגיאה לא צפויה בחיבור לשרת";
        setHealth({ kind: "error", message });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ברוכים הבאים ל-Handil</Text>
      <Text style={styles.subtitle}>מחברים בין דיירים חדשים לבעלי מקצוע בתל אביב</Text>

      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>חיבור לשרת</Text>
        <Text style={styles.mono} selectable>
          {API_BASE_URL}
        </Text>
        {health.kind === "loading" && (
          <View style={styles.row}>
            <ActivityIndicator />
            <Text style={styles.statusText}>בודקים…</Text>
          </View>
        )}
        {health.kind === "ok" && (
          <Text style={styles.okText}>השרת זמין ({health.service})</Text>
        )}
        {health.kind === "error" && <Text style={styles.errText}>{health.message}</Text>}
      </View>

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
  },
  statusBox: {
    marginTop: 28,
    width: "100%",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    color: "#111827",
    marginBottom: 8
  },
  mono: {
    fontSize: 12,
    textAlign: "left",
    color: "#6B7280",
    marginBottom: 12
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10
  },
  statusText: {
    fontSize: 14,
    color: "#374151"
  },
  okText: {
    fontSize: 14,
    textAlign: "right",
    color: "#047857",
    fontWeight: "600"
  },
  errText: {
    fontSize: 14,
    textAlign: "right",
    color: "#B91C1C"
  }
});
