import api from './api';
import { useAuthStore } from '../store/authStore';

/**
 * Keluar: token dicabut di server dulu (POST /auth/logout menaikkan versi token
 * akun ini, jadi token yang sama tidak bisa dipakai lagi di mana pun - pentest
 * F-04), baru dihapus dari browser. Ditunggu, karena request-nya butuh token
 * yang masih ada; gagal pun (misalnya sudah kedaluwarsa) tetap keluar.
 */
export async function signOut(navigate: (to: string) => void) {
  try {
    await api.post('/auth/logout');
  } catch {
    // Token sudah tidak berlaku atau server tak terjangkau: cukup keluar di sini.
  }
  useAuthStore.getState().logout();
  navigate('/login');
}
