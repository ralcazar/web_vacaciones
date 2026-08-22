import type { CalendarEntry, YearConfig, YearData } from '../domain/models';
import { HALF_LD_CODE, HALF_LD_LIMIT } from '../domain/calendar';
import type { CalendarRepository } from '../repositories/CalendarRepository';

export const emptyYear = (year: number): YearData => ({
  version: 2,
  year,
  dayTypes: [
    { code: 'V60', name: 'Vacaciones', limit: 26, color: '#d97555' },
    { code: 'TT', name: 'Teletrabajo', limit: 104, color: '#327f77' },
    { code: 'LD', name: 'Libre disposición', limit: 5, color: '#8b6bb1' },
    { code: HALF_LD_CODE, name: 'Medio día de libre disposición', limit: HALF_LD_LIMIT, color: '#b395d0' },
  ],
  holidays: [],
  days: {},
});
export const entriesOf = (data: YearData): CalendarEntry[] => Object.entries(data.days).map(([date, day]) => ({ date, ...day }));

export async function loadOrCreateYear(repository: CalendarRepository, year: number) {
  const existing = await repository.getYear(year);
  if (existing) return existing;
  const created = emptyYear(year);
  await repository.saveYear(created);
  return created;
}

export function toConfig(data: YearData): YearConfig { return { year: data.year, dayTypes: data.dayTypes }; }
