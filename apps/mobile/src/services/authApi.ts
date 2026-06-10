import { User } from '../types';
import { apiClient } from './apiClient';

export interface AuthResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'resident' | 'worker';
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

export async function updateMyProfile(patch: { phone?: string; city?: string; name?: string }) {
  const { data } = await apiClient.put('/auth/me', patch);
  return data as { user: User };
}
