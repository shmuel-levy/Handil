export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'resident' | 'worker';
  avatar: string;
  city?: string;
}

export interface WorkerStats {
  totalJobsDone: number;
  completionRate: number | null;   // 0–100 percent
  quoteAcceptRate: number | null;  // 0–100 percent
  avgResponseHours: number | null;
}

export interface PortfolioItem {
  _id: string;
  title: string;
  description?: string;
  beforeImage?: string;
  afterImage?: string;
  category?: string;
  createdAt: string;
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
  verificationBadges?: Array<'phone' | 'id' | 'bank'>;
  portfolio?: PortfolioItem[];
  gallery?: string[];
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

export interface Quote {
  _id: string;
  jobPost: string | JobPost;
  worker: {
    _id: string;
    user: { _id: string; name: string; avatar: string; phone?: string };
    bio: string;
    rating: number;
    reviewCount: number;
    city: string;
    yearsExperience: number;
    categories: string[];
    isVerified: boolean;
    verificationBadges?: Array<'phone' | 'id' | 'bank'>;
  };
  proposedPrice: number;
  message: string;
  estimatedArrivalDate?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  conversation: string;
  sender: { _id: string; name: string; avatar: string; role: string };
  text: string;
  readBy: string[];
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: Array<{ _id: string; name: string; avatar: string; role: string }>;
  jobPost: { _id: string; title: string; category: string } | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCounts?: Record<string, number>;
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
  pendingQuoteCount?: number;
}
