export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'resident' | 'worker';
  avatar: string;
}

export interface WorkerProfile {
  _id: string;
  user: {
    _id: string;
    name: string;
    phone: string;
    avatar: string;
  };
  bio: string;
  categories: string[];
  city: string;
  yearsExperience: number;
  hourlyRate: number | null;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  isVerified: boolean;
}

export interface Review {
  _id: string;
  resident: { _id: string; name: string; avatar: string };
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Booking {
  _id: string;
  resident: { _id: string; name: string; phone: string; avatar: string };
  worker: { _id: string; name: string; phone: string; avatar: string };
  category: string;
  description: string;
  scheduledDate: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  price: number | null;
  createdAt: string;
}
