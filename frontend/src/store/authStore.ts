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

/** 401 dari endpoint login artinya password salah, bukan sesi habis. */
export const isLoginRequest = (url?: string) => String(url ?? '').includes('/auth/login');

let expiring = false;

/**
 * Sesi habis: server menjawab 401 pada request apa pun selain login.
 *
 * Keluar sepenuhnya - token, `auth-storage`, dan state - lalu ke halaman login
 * dengan keterangan. Dulu client utama (lib/api) tidak menangani 401 sama
 * sekali, jadi halaman tetap terbuka dengan request yang gagal diam-diam; dan
 * client satunya hanya menghapus `token`, sehingga user+token di
 * `auth-storage` masih membuat aplikasi mengira sudah login.
 *
 * Sekali saja: request lain yang ikut kena 401 bersamaan tidak memicu
 * redirect kedua.
 */
export function expireSession() {
  if (expiring) return;
  expiring = true;
  useAuthStore.getState().logout();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace('/login?expired=1');
  } else {
    expiring = false;
  }
}
