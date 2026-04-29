import axios from 'axios';

// Vite env priority:
// 1) VITE_API_URL (recommended)
// 2) localhost for local dev
// 3) deployed backend fallback
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://thuvienbd.vercel.app/api');

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Nếu data là FormData, xóa Content-Type header để axios tự set
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  
  return config;
});

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const userAPI = {
  getMySubscription: () => api.get('/users/subscription/me'),
  submitPaymentProof: (formData) =>
    api.post('/users/subscription/payment-proof', formData)
};

// Book APIs
export const bookAPI = {
  getBooks: (params) => api.get('/books', { params }),
  searchBooks: (query) => api.get('/books/search', { params: { q: query } }),
  getBook: (id) => api.get(`/books/${id}`),
};

// Borrow APIs
export const borrowAPI = {
  getBorrows: (params) => api.get('/borrows', { params }),
  getBorrow: (id) => api.get(`/borrows/${id}`),
  createBorrow: (data) => api.post('/borrows', data),
  extendBorrow: (id) => api.patch(`/borrows/${id}/extend`),
  // NEW: Hủy phiếu mượn (chỉ khi status = pending)
  cancelBorrow: (id) => api.delete(`/borrows/${id}`),
};

export default api;