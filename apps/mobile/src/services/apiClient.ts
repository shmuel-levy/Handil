import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * In Expo Go dev, `expoConfig.hostUri` is usually the machine running Metro (e.g. `192.168.1.103:8081`).
 * The API runs on the same machine, so we reuse that host with port 4000 — works on a physical phone on the same LAN.
 * Override anytime with EXPO_PUBLIC_API_BASE_URL in `.env`.
 */
function hostFromExpoDev(): string | null {
  if (!__DEV__) return null;
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri || typeof hostUri !== "string") return null;
  const withoutScheme = hostUri.replace(/^exp:\/\//i, "");
  const host = withoutScheme.split(":")[0]?.trim();
  if (!host) return null;
  return host;
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const devHost = hostFromExpoDev();
  if (devHost) {
    return `http://${devHost}:4000/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000/api";
  }

  return "http://localhost:4000/api";
}

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});
