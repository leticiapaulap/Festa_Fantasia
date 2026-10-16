import type { EventSettings } from '../types/api';

export function getPartyStart(settings: EventSettings | null) {
  if (!settings?.eventDate || !settings.eventTime) return null;
  const [year, month, day] = settings.eventDate.split('-').map(Number);
  const [hour, minute] = settings.eventTime.split(':').map(Number);
  const requestedTime = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone || 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  let timestamp = requestedTime;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = formatter.formatToParts(new Date(timestamp));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const representedTime = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
    timestamp += requestedTime - representedTime;
  }
  return new Date(timestamp);
}

export function countdownValues(remaining: number) {
  const totalSeconds = Math.floor(Math.max(0, remaining) / 1000);
  return [
    { value: Math.floor(totalSeconds / 86400), label: 'Dias' },
    { value: Math.floor((totalSeconds % 86400) / 3600), label: 'Horas' },
    { value: Math.floor((totalSeconds % 3600) / 60), label: 'Minutos' },
    { value: totalSeconds % 60, label: 'Segundos' },
  ];
}
