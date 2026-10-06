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

// Response interceptor for unwrapping the standardized response
api.interceptors.response.use(
  (response) => {
    // If the response follows our backend's TransformInterceptor format.
    // The object check is required: `in` throws on a string, and the document
    // print endpoints return raw HTML rather than the JSON envelope.
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      'statusCode' in response.data
    ) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !isLoginRequest(error.config?.url)) expireSession();
    return Promise.reject(error);
  }
);

export default api;
