export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  SearchTab: { category?: string; categoryName?: string } | undefined;
  BookingsTab: undefined;
  PostsTab: undefined;
  ProfileTab: undefined;
};

export type PostsStackParamList = {
  PostsFeed: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };
};

export type HomeStackParamList = {
  Home: undefined;
  WorkerList: { category: string; categoryName: string };
  WorkerDetail: { workerId: string; workerName: string };
  BookingRequest: { workerId: string; workerUserId: string; workerName: string; category?: string };
};

export type SearchStackParamList = {
  Search: { category?: string; categoryName?: string } | undefined;
  WorkerDetail: { workerId: string; workerName: string };
  BookingRequest: { workerId: string; workerUserId: string; workerName: string; category?: string };
};

export type BookingsStackParamList = {
  Bookings: undefined;
  BookingDetail: { bookingId: string };
};
