import type { CalendarEntry, Counter, YearConfig } from './models';

export function calculateCounters(config: YearConfig, entries: CalendarEntry[]): Counter[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.type === 'telework' ? 'telework' : entry.code;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const make = (code: string, name: string, limit: number, color?: string): Counter => {
    const used = counts.get(code) ?? 0;
    return { code, name, used, limit, remaining: limit - used, exceeded: used > limit, color };
  };
  return [make('telework', 'Teletrabajo', config.teleworkLimit, '#327f77'), ...config.leaveTypes.map(t => make(t.code, t.name, t.limit, t.color))];
}

export const isWeekend = (date: string): boolean => [0, 6].includes(new Date(`${date}T12:00:00`).getDay());
