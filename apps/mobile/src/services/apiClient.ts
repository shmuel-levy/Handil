import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

// ── Host detection ────────────────────────────────────────────────────────────
// When running in Expo Go on a physical device, the Metro bundler host
// is embedded in Constants — so we can auto-detect the dev machine IP
// without having to update .env every time the network changes.

function hostFromExpoDev(): string | null {
  if (!__DEV__) return null;

  const candidates: unknown[] = [
    Constants.expoConfig?.hostUri,
    (Constants as any).manifest?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const stripped = raw.replace(/^exp:\/\//i, '').replace(/^https?:\/\//i, '');
    const host = stripped.split(':')[0]?.trim();
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }

  return null;
}

function resolveApiBaseUrl(): string {
  // Production builds: env var is required (set in eas.json or CI).
  // Never auto-detect in production — server is remote, not on the LAN.
  if (!__DEV__) {
    const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    return 'http://localhost:4000/api'; // unreachable in practice; satisfies type
  }

  // Dev web: browser and server share the same machine, so localhost always works.
  // Do NOT use the env var here — it may hold a LAN IP meant for mobile devices.
  if (Platform.OS === 'web') return 'http://localhost:4000/api';

  // Dev native: auto-detect the dev machine IP from the Expo Go / Metro host.
  // This updates automatically on every session, so .env rarely needs touching.
  const devHost = hostFromExpoDev();
  if (devHost) {
    const url = `http://${devHost}:4000/api`;
    logger.info('API', `Auto-detected host → ${url}`);
    return url;
  }

  // Dev native fallback: manual override via .env (useful when auto-detect fails)
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    const url = fromEnv.replace(/\/$/, '');
    logger.info('API', `Using env URL → ${url}`);
    return url;
  }

  // Android emulator
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000/api';

  return 'http://localhost:4000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export function getBaseUrl(): string {
  return API_BASE_URL;
}

// Log the resolved URL once at module load so you can always see it in Metro
if (__DEV__) {
  console.log(`\n🌐 [API] Base URL: ${API_BASE_URL}\n`);
}

// ── Axios instance ────────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

// ── Request interceptor — attach JWT + log ────────────────────────────────────

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('handil_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  logger.api.request(
    config.method ?? 'GET',
    (config.baseURL ?? '') + (config.url ?? ''),
    config.data,
  );

  return config;
});

// ── Response interceptors — log success + errors ──────────────────────────────

apiClient.interceptors.response.use(
  (response) => {
    logger.api.response(
      response.status,
      (response.config.baseURL ?? '') + (response.config.url ?? ''),
      response.data,
    );
    return response;
  },
  (error) => {
    const url =
      (error.config?.baseURL ?? '') + (error.config?.url ?? '');
    logger.api.error(url, error);
    return Promise.reject(error);
  },
);
