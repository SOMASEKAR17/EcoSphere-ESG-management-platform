import axios from 'axios';

/**
 * Central Axios instance for all EcoSphere API calls.
 * Base URL is pulled from the VITE_API_BASE_URL env var (set to /api in Docker,
 * which is reverse-proxied by Nginx to the backend container).
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecosphere_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors — redirect to login on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Token expired or invalid — clear and redirect to login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('ecosphere_token');
        localStorage.removeItem('ecosphere_user');
        window.location.href = '/login';
      }
    }
    const message =
      error?.response?.data?.detail || error?.message || 'Unexpected API error';
    return Promise.reject({ ...error, message });
  }
);

export default apiClient;
