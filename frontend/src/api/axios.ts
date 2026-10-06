import axios from 'axios';
import { expireSession, isLoginRequest } from '../store/authStore';

// Sesi login ada di cookie HttpOnly yang dipasang server; browser mengirimnya
// sendiri. withCredentials hanya berpengaruh saat API beda origin (dev dengan
// VITE_API_URL). X-Requested-With wajib untuk request yang mengubah data - server
// menolak tanpanya (perlindungan CSRF, lihat main.ts di backend).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 401 dari login berarti password salah, bukan sesi habis. Redirect di sini
    // me-reload halaman login dan pesan error-nya hilang sebelum sempat tampil.
    if (error.response?.status === 401 && !isLoginRequest(error.config?.url)) expireSession();
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;
