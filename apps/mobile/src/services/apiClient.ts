import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function hostFromExpoDev(): string | null {
  if (!__DEV__) return null;
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri || typeof hostUri !== 'string') return null;
  const withoutScheme = hostUri.replace(/^exp:\/\//i, '');
  const host = withoutScheme.split(':')[0]?.trim();
  return host || null;
}

function resolveApiBaseUrl(): string {
  // Web browser on the same machine as the API server — always use localhost
  if (Platform.OS === 'web') return 'http://localhost:4000/api';

  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const devHost = hostFromExpoDev();
  if (devHost) return `http://${devHost}:4000/api`;

  if (Platform.OS === 'android') return 'http://10.0.2.2:4000/api';
  return 'http://localhost:4000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Attach JWT token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('handil_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
