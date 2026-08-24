import type { CalendarEntry, YearConfig, YearData } from '../domain/models';
import { defaultUseUntil, HALF_LD_CODE, HALF_LD_LIMIT, SAN_ISIDRO_CODE } from '../domain/calendar';
import type { CalendarRepository } from '../repositories/CalendarRepository';

export const emptyYear = (year: number): YearData => ({
  version: 3,
  year,
  dayTypes: [
    { code: 'V60', name: 'Vacaciones', limit: 26, color: '#d97555', useUntil: defaultUseUntil(year, 'V60') },
    { code: 'TT', name: 'Teletrabajo', limit: 104, color: '#327f77', useUntil: defaultUseUntil(year, 'TT') },
    { code: 'SAB', name: 'Compensación sábados festivos', limit: 2, color: '#3f7da6', useUntil: defaultUseUntil(year, 'SAB') },
    { code: 'HIJO', name: 'Hijo < 12 años', limit: 1, color: '#b06f8f', useUntil: defaultUseUntil(year, 'HIJO') },
    { code: 'ANT', name: 'Antigüedad', limit: 0, color: '#718096', useUntil: defaultUseUntil(year, 'ANT') },
    { code: 'LD', name: 'Libre disposición', limit: 5, color: '#8b6bb1', useUntil: defaultUseUntil(year, 'LD') },
    { code: HALF_LD_CODE, name: 'Medio día de libre disposición', limit: HALF_LD_LIMIT, color: '#b395d0', useUntil: defaultUseUntil(year, HALF_LD_CODE) },
    { code: SAN_ISIDRO_CODE, name: 'San Isidro', limit: 1, color: '#d08b3e', useUntil: defaultUseUntil(year, SAN_ISIDRO_CODE) },
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
