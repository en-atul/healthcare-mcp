import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
  const authStore = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const checkHydration = () => {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          console.log('useAuth - Stored auth data:', parsed);
          setIsHydrated(true);
        } catch (error) {
          console.error('useAuth - Error parsing stored auth data:', error);
          setIsHydrated(true);
        }
      } else {
        setIsHydrated(true);
      }
    };

    checkHydration();
  }, []);

  return {
    ...authStore,
    isHydrated,
  };
}
