import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: (token, user) => {
    AsyncStorage.setItem('handil_token', token);
    AsyncStorage.setItem('handil_user', JSON.stringify(user));
    set({ token, user });
  },

  updateUser: (patch) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...patch };
      AsyncStorage.setItem('handil_user', JSON.stringify(updated));
      return { user: updated };
    });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['handil_token', 'handil_user']);
    set({ token: null, user: null });
  },

  loadAuth: async () => {
    try {
      const [token, userStr] = await AsyncStorage.multiGet(['handil_token', 'handil_user']);
      const t = token[1];
      const u = userStr[1];
      if (t && u) {
        set({ token: t, user: JSON.parse(u) });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
