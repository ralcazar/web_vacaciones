import type { CalendarEntry, Counter, DayType, YearConfig } from './models';

export function calculateCounters(config: YearConfig, entries: CalendarEntry[]): Counter[] {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1);
  return config.dayTypes.map(type => {
    const used = counts.get(type.code) ?? 0;
    return { ...type, used, remaining: type.limit - used, exceeded: used > type.limit };
  });
}

export const isWeekend = (date: string): boolean => [0, 6].includes(new Date(`${date}T12:00:00`).getDay());

export function nextDayTypeCode(dayTypes: DayType[], currentCode?: string): string | undefined {
  if (!currentCode) return dayTypes[0]?.code;
  const currentIndex = dayTypes.findIndex(type => type.code === currentCode);
  return currentIndex >= 0 ? dayTypes[currentIndex + 1]?.code : dayTypes[0]?.code;
}
