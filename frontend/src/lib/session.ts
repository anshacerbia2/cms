import api from './api';
import { useAuthStore } from '../store/authStore';

/**
 * Keluar: sesi dicabut di server dulu (POST /auth/logout menaikkan versi token
 * akun ini, jadi token yang sama tidak bisa dipakai lagi di mana pun - pentest
 * F-04 - lalu menghapus cookie sesinya), baru profilnya dihapus dari browser.
 * Ditunggu, karena request-nya membawa cookie yang masih ada; gagal pun
 * (misalnya server tak terjangkau) tetap keluar.
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
