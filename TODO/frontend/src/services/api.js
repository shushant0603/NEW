import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health
  getHealth: async () => {
    const res = await apiClient.get('/health');
    return res.data;
  },

  // Dataset Info
  getDataSummary: async () => {
    const res = await apiClient.get('/data/summary');
    return res.data;
  },

  getMetadata: async () => {
    const res = await apiClient.get('/data/metadata');
    return res.data;
  },

  getQualityReport: async () => {
    const res = await apiClient.get('/data/quality-report');
    return res.data;
  },

  getHistorical: async (params) => {
    const res = await apiClient.get('/data/historical', { params });
    return res.data;
  },

  uploadDataset: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/data/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data;
  },

  // Forecasting
  generateForecast: async (payload) => {
    const res = await apiClient.post('/forecast', payload);
    return res.data;
  },

  compareModels: async (payload) => {
    const res = await apiClient.post('/forecast/compare', payload);
    return res.data;
  },

  exportForecast: async (payload) => {
    const res = await apiClient.post('/export/forecast', payload, {
      responseType: 'blob',
    });
    // Trigger browser download
    const blob = new Blob([res.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `forecast_${payload.level}_${payload.target}_${payload.horizon || 12}m.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Analytics & Insights
  getTrends: async () => {
    const res = await apiClient.get('/analytics/trends');
    return res.data;
  },
};

export default api;
