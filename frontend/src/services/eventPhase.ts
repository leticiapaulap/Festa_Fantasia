import type { EventSettings } from '../types/api';

export type EventPhase = 'REGISTRATION' | 'PREPARATION' | 'VOTING' | 'FINISHED';

export function eventPhase(settings: EventSettings | null): EventPhase {
  if (!settings) return 'PREPARATION';
  if (settings.votingStatus === 'CLOSED' || settings.votingAvailability === 'AFTER_WINDOW') return 'FINISHED';
  if (settings.canAcceptVotes) return 'VOTING';
  if (settings.registrationOpen && settings.votingStatus === 'DRAFT') return 'REGISTRATION';
  return 'PREPARATION';
}

export function votingStatusLabel(settings: EventSettings | null) {
  if (!settings) return 'Aguardando';
  if (settings.canAcceptVotes) return 'Aberta';
  if (settings.votingStatus === 'CLOSED' || settings.votingAvailability === 'AFTER_WINDOW') return 'Encerrada';
  return 'Aguardando';
}

export function registrationStatusLabel(settings: EventSettings | null) {
  return settings?.registrationOpen ? 'Abertos' : 'Encerrados';
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
