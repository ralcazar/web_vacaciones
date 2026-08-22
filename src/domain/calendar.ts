import type { CalendarEntry, Counter, DayType, YearConfig } from './models';

export const HALF_LD_CODE = '1/2 LD';
export const HALF_LD_LIMIT = 6;
export const SAN_ISIDRO_CODE = 'SI';

export function isDayTypeAvailable(code: string, date: string): boolean {
  if (code !== SAN_ISIDRO_CODE) return true;
  const monthDay = date.slice(5);
  return monthDay >= '05-16' && monthDay <= '06-30';
}

export function calculateCounters(config: YearConfig, entries: CalendarEntry[]): Counter[] {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1);
  return config.dayTypes.map(type => {
    // Up to three LD may be split into six half days. The half-day counter
    // enforces that cap, while the LD counter keeps showing the shared balance.
    const used = type.code === 'LD'
      ? (counts.get(type.code) ?? 0) + (counts.get(HALF_LD_CODE) ?? 0) / 2
      : counts.get(type.code) ?? 0;
    return { ...type, used, remaining: type.limit - used, exceeded: used > type.limit };
  });
}

export const isWeekend = (date: string): boolean => [0, 6].includes(new Date(`${date}T12:00:00`).getDay());

export function nextDayTypeCode(dayTypes: DayType[], currentCode?: string, date?: string): string | undefined {
  const currentIndex = currentCode ? dayTypes.findIndex(type => type.code === currentCode) : -1;
  return dayTypes.slice(currentIndex + 1).find(type => !date || isDayTypeAvailable(type.code, date))?.code;
}
