import { Review, WorkerProfile } from '../types';
import { apiClient } from './apiClient';

export async function getWorkers(params?: {
  category?: string;
  city?: string;
  q?: string;
  page?: number;
}): Promise<{ workers: WorkerProfile[] }> {
  const { data } = await apiClient.get('/workers', { params });
  return data;
}

export async function getWorker(id: string): Promise<{ worker: WorkerProfile; reviews: Review[] }> {
  const { data } = await apiClient.get(`/workers/${id}`);
  return data;
}

export async function getMyWorkerProfile(): Promise<{ worker: WorkerProfile }> {
  const { data } = await apiClient.get('/workers/me');
  return data;
}

export async function updateWorkerProfile(payload: {
  bio?: string;
  categories?: string[];
  city?: string;
  yearsExperience?: number;
  hourlyRate?: number;
  isAvailable?: boolean;
}): Promise<{ worker: WorkerProfile }> {
  const { data } = await apiClient.put('/workers/me', payload);
  return data;
}
