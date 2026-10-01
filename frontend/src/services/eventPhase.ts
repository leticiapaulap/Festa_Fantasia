import type { EventSettings } from '../types/api';

export type EventPhase = 'REGISTRATION' | 'PREPARATION' | 'VOTING' | 'FINISHED';

export function eventPhase(settings: EventSettings | null): EventPhase {
  if (!settings) return 'REGISTRATION';
  if (settings.votingState === 'RESULT_PUBLISHED' || settings.votingState === 'RESULT_PENDING' || settings.votingState === 'CLOSED') return 'FINISHED';
  if (settings.votingState === 'OPEN' || settings.votingState === 'TEST') return 'VOTING';
  if (settings.registrationOpen) return 'REGISTRATION';
  return 'PREPARATION';
}

export function votingStatusLabel(settings: EventSettings | null) {
  if (!settings) return 'Aguardando';
  return ({
    TEST: 'Modo de teste',
    WAITING: 'Aguardando',
    OPEN: 'Aberta',
    CLOSED: 'Encerrada',
    RESULT_PENDING: 'Resultado pendente',
    RESULT_PUBLISHED: 'Resultado publicado',
  })[settings.votingState ?? settings.votingAvailability] ?? 'Aguardando';
}

export function registrationStatusLabel(settings: EventSettings | null) {
  return settings?.registrationOpen === false ? 'Encerrados' : 'Abertos';
}

export function formatEventDate(settings: EventSettings | null) {
  if (!settings?.eventDate) return '';
  const [year, month, day] = settings.eventDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dateText = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  if (!settings.eventTime) return dateText;
  const [hour, minute] = settings.eventTime.split(':');
  return `${dateText}, a partir das ${hour}h${minute === '00' ? '' : minute}`;
}
