import { Quote } from '../types';
import { apiClient } from './apiClient';

export async function submitQuote(data: {
  jobPostId: string;
  proposedPrice: number;
  message?: string;
  estimatedArrivalDate?: string;
}) {
  const res = await apiClient.post('/quotes', data);
  return res.data as { quote: Quote };
}

export async function getJobQuotes(jobId: string) {
  const res = await apiClient.get(`/quotes/job/${jobId}`);
  return res.data as { quotes: Quote[]; total: number };
}

export async function checkMyQuote(jobId: string) {
  const res = await apiClient.get(`/quotes/check/${jobId}`);
  return res.data as { quote: Quote | null };
}

export async function getMyQuotes() {
  const res = await apiClient.get('/quotes/my');
  return res.data as { quotes: Quote[] };
}

export async function acceptQuote(quoteId: string) {
  const res = await apiClient.patch(`/quotes/${quoteId}/accept`);
  return res.data as { quote: Quote };
}

export async function rejectQuote(quoteId: string) {
  const res = await apiClient.patch(`/quotes/${quoteId}/reject`);
  return res.data as { quote: Quote };
}
