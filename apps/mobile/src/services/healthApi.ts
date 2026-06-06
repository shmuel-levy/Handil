import { apiClient } from './apiClient';

export interface HealthResponse {
  status: string;
  service: string;
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health', { signal });
  return data;
}
