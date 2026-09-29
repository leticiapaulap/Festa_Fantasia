import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const baseURL = apiUrl || (import.meta.env.DEV ? 'http://localhost:8080/api' : '');
export const isApiConfigured = Boolean(apiUrl || import.meta.env.DEV);

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  if (!isApiConfigured) {
    return Promise.reject(new Error('API_PUBLICA_NAO_CONFIGURADA'));
  }
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function apiMessage(error: unknown) {
  if (error instanceof Error && error.message === 'API_PUBLICA_NAO_CONFIGURADA') {
    return 'API pública não configurada. Defina VITE_API_URL no deployment.';
  }
  if (!baseURL) {
    return 'API pública não configurada. Defina VITE_API_URL no deployment.';
  }
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Nao foi possivel conectar a API. Verifique a URL publica do backend.';
    }
    const data = error.response?.data as { message?: string; errors?: string[] } | undefined;
    return data?.errors?.[0] ?? data?.message ?? 'Não foi possível concluir a operação.';
  }
  return 'Não foi possível concluir a operação.';
}
