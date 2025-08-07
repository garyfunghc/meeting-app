import axios from 'axios';

const API_BASE = 'http://localhost:13001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Response interceptor to handle errors
api.interceptors.response.use(
  response => {
    // Check if response is HTML (error page)
    if (typeof response.data === 'string' && response.data.startsWith('<!DOCTYPE html>')) {
      return Promise.reject(new Error('Server returned HTML instead of JSON'));
    }
    return response;
  },
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
