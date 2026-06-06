import { JobPost } from '../types';
import { apiClient } from './apiClient';

export async function getOpenPosts(params?: { category?: string; page?: number }) {
  const res = await apiClient.get('/posts', { params: { status: 'open', ...params } });
  return res.data as { posts: JobPost[]; total: number; page: number };
}

export async function getMyPosts() {
  const res = await apiClient.get('/posts/mine');
  return res.data as { posts: JobPost[] };
}

export async function getPost(id: string) {
  const res = await apiClient.get(`/posts/${id}`);
  return res.data as { post: JobPost };
}

export async function createPost(data: {
  title: string;
  description?: string;
  category: string;
  budget?: number | null;
  images?: string[];
  urgency?: string;
  location?: string;
}) {
  const res = await apiClient.post('/posts', data);
  return res.data as { post: JobPost };
}

export async function acceptPost(id: string) {
  const res = await apiClient.post(`/posts/${id}/accept`);
  return res.data as { post: JobPost };
}

export async function closePost(id: string) {
  const res = await apiClient.post(`/posts/${id}/close`);
  return res.data as { post: JobPost };
}
