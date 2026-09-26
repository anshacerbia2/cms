import axios from 'axios';
import { expireSession, isLoginRequest } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
