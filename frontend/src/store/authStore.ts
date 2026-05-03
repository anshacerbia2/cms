import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  menus: {
    group: string;
    icon: string;
    items: {
      title: string;
      icon: string;
      url: string;
    }[];
  }[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  can: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('token');
        localStorage.removeItem('auth-storage');
      },
      can: (permission: string) => {
        const user = get().user;
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions.includes(permission);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
