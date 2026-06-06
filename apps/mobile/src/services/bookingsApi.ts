import { Booking } from '../types';
import { apiClient } from './apiClient';

export async function createBooking(payload: {
  workerUserId: string;
  category: string;
  description?: string;
  scheduledDate?: string;
}): Promise<{ booking: Booking }> {
  const { data } = await apiClient.post('/bookings', payload);
  return data;
}

export async function getMyBookings(): Promise<{ bookings: Booking[] }> {
  const { data } = await apiClient.get('/bookings');
  return data;
}

export async function updateBookingStatus(
  id: string,
  status: 'accepted' | 'rejected' | 'completed' | 'cancelled'
): Promise<{ booking: Booking }> {
  const { data } = await apiClient.patch(`/bookings/${id}/status`, { status });
  return data;
}
