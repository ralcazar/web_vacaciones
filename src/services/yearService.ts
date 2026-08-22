import type { CalendarEntry, YearConfig, YearData } from '../domain/models';
import type { CalendarRepository } from '../repositories/CalendarRepository';

export const emptyYear = (year: number): YearData => ({ version: 1, year, settings: { teleworkLimit: 104 }, leaveTypes: [], holidays: [], days: {} });
export const entriesOf = (data: YearData): CalendarEntry[] => Object.entries(data.days).map(([date, day]) => ({ date, ...day } as CalendarEntry));

export async function loadOrCreateYear(repository: CalendarRepository, year: number) {
  const existing = await repository.getYear(year);
  if (existing) return existing;
  const created = emptyYear(year);
  await repository.saveYear(created);
  return created;
}

export function toConfig(data: YearData): YearConfig {
  return { year: data.year, teleworkLimit: data.settings.teleworkLimit, leaveTypes: data.leaveTypes };
}
