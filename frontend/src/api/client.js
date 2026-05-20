import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 15_000,
});

// Global response interceptor — surfaces API errors clearly
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message || "Network error";
    return Promise.reject(new Error(msg));
  }
);

export default api;
