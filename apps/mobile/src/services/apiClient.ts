import axios from "axios";
import { Platform } from "react-native";

/**
 * Base URL for the Express API.
 * - Prefer EXPO_PUBLIC_API_BASE_URL in .env (required on a physical device: use your PC's LAN IP).
 * - Android emulator: host machine is 10.0.2.2 (not localhost).
 * - iOS simulator / web: localhost works for the dev machine.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
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
