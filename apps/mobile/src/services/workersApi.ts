import { JobPost, PortfolioItem, Review, WorkerProfile, WorkerStats } from '../types';
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

export async function getWorker(
  id: string
): Promise<{ worker: WorkerProfile; reviews: Review[]; stats: WorkerStats }> {
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

export async function toggleAvailable(isAvailable: boolean): Promise<{ worker: WorkerProfile }> {
  const { data } = await apiClient.patch('/workers/me/available', { isAvailable });
  return data;
}

export async function addVerificationBadge(
  badge: 'phone' | 'id' | 'bank'
): Promise<{ worker: WorkerProfile }> {
  const { data } = await apiClient.post('/workers/me/verify', { badge });
  return data;
}

export async function addPortfolioItem(item: {
  title: string;
  description?: string;
  beforeImage?: string;
  afterImage?: string;
  category?: string;
}): Promise<{ worker: WorkerProfile }> {
  const { data } = await apiClient.post('/workers/me/portfolio', item);
  return data;
}

export async function deletePortfolioItem(itemId: string): Promise<{ worker: WorkerProfile }> {
  const { data } = await apiClient.delete(`/workers/me/portfolio/${itemId}`);
  return data;
}

export async function getRecommendedPosts(): Promise<{
  posts: JobPost[];
  total: number;
  isPersonalized: boolean;
}> {
  const { data } = await apiClient.get('/posts/recommended');
  return data;
}
