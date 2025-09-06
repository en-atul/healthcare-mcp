import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'therapist';
  photo?: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, gender: 'male' | 'female') => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { apiClient } = await import('@/lib/api-client');
          const data = await apiClient.login(email, password);
          console.log('Auth store login data:', data);
          set({
            user: data.patient,
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Auth store login error:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name: string, email: string, password: string, gender: 'male' | 'female') => {
        set({ isLoading: true });
        try {
          const { apiClient } = await import('@/lib/api-client');
          const [firstName, ...lastNameParts] = name.split(' ');
          const lastName = lastNameParts.join(' ') || '';
          const data = await apiClient.register(firstName, lastName, email, password, { gender });
          set({
            user: data.patient,
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setToken: (token: string) => {
        set({ token });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Auth store rehydrated:', state);
        if (state?.user && state?.token) {
          console.log('User found in storage, setting authenticated');
        }
      },
    }
  )
);
