import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
const baseURL = apiUrl || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api');
export const isApiConfigured = true;

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
  if (error instanceof Error && error.message === 'INVALID_SETTINGS_RESPONSE') {
    return 'A API de configurações respondeu em formato inválido. Verifique VITE_API_URL no deployment.';
  }
  if (error instanceof Error && error.message === 'INVALID_PARTICIPANTS_RESPONSE') {
    return 'A API de participantes respondeu em formato inválido. Verifique VITE_API_URL no deployment.';
  }
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível conectar à API. Verifique a URL pública do backend.';
    }
    if (typeof error.response.data === 'string') {
      return 'A API do backend não respondeu corretamente. Verifique VITE_API_URL no deployment.';
    }
    const data = error.response?.data as { message?: string; errors?: string[] } | undefined;
    return data?.errors?.[0] ?? data?.message ?? 'Não foi possível concluir a operação.';
  }
  return 'Não foi possível concluir a operação.';
}
