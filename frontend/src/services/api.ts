import axios from 'axios';
import type { EventSettings, Participant } from '../types/api';

const apiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
const baseURL = normalizeApiBaseUrl(apiUrl);
export const isApiConfigured = true;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

function normalizeApiBaseUrl(value?: string) {
  if (!value) return import.meta.env.DEV ? 'http://localhost:8080/api' : '/api';
  if (typeof window !== 'undefined' && value === window.location.origin) return '/api';
  return value.endsWith('/api') ? value : `${value}/api`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function apiMessage(error: unknown) {
  if (error instanceof Error && error.message === 'INVALID_SETTINGS_RESPONSE') {
    return 'Não foi possível carregar as configurações do evento.';
  }
  if (error instanceof Error && error.message === 'INVALID_PARTICIPANTS_RESPONSE') {
    return 'Não foi possível carregar os participantes.';
  }
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível conectar à API. Verifique a URL pública do backend.';
    }
    if (typeof error.response.data === 'string') {
      return 'A API do backend não respondeu corretamente.';
    }
    const data = error.response?.data as { message?: string; errors?: string[] } | undefined;
    return data?.errors?.[0] ?? data?.message ?? 'Não foi possível concluir a operação.';
  }
  return 'Não foi possível concluir a operação.';
}

export function ensureSettings(data: unknown): EventSettings {
  if (!data || typeof data !== 'object' || typeof (data as EventSettings).registrationOpen !== 'boolean') {
    throw new Error('INVALID_SETTINGS_RESPONSE');
  }
  return data as EventSettings;
}

export function ensureParticipants(data: unknown): Participant[] {
  if (!Array.isArray(data)) {
    throw new Error('INVALID_PARTICIPANTS_RESPONSE');
  }
  return data as Participant[];
}
