import axios from 'axios';

/**
 * Central Axios instance for all EcoSphere API calls.
 * Base URL and API key are pulled from environment variables (see .env.example).
 * Swap VITE_API_BASE_URL / VITE_API_KEY once the real backend is available —
 * no other code needs to change.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach API key / auth token on every request
apiClient.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    config.headers.Authorization = `Bearer ${apiKey}`;
  }
  const token = localStorage.getItem('ecosphere_token');
  if (token) {
    config.headers['X-Auth-Token'] = token;
  }
  return config;
});

// Normalize error responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message || error?.message || 'Unexpected API error';
    return Promise.reject({ ...error, message });
  }
);

export default apiClient;
