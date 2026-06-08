export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'resident' | 'worker';
  avatar: string;
  city?: string;
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
  urgencyRates?: {
    urgent: number | null;
    today: number | null;
    week: number | null;
    flexible: number | null;
  };
  offersTeaching?: boolean;
  teachingRate?: number | null;
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

export interface JobPost {
  _id: string;
  resident: { _id: string; name: string; avatar: string; phone?: string };
  title: string;
  description: string;
  category: string;
  budget: number | null;
  images: string[];
  status: 'open' | 'accepted' | 'closed';
  acceptedBy: { _id: string; name: string; avatar: string } | null;
  urgency: 'urgent' | 'today' | 'week' | 'flexible';
  location: string;
  createdAt: string;
  updatedAt: string;
}
