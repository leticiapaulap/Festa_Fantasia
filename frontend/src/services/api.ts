import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const baseURL = apiUrl || (import.meta.env.DEV ? 'http://localhost:8080/api' : undefined);
export const isApiConfigured = Boolean(baseURL);

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function apiMessage(error: unknown) {
  if (!baseURL) {
    return 'API publica nao configurada. Defina VITE_API_URL no deployment.';
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
