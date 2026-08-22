import type { CalendarEntry, YearConfig, YearData } from '../domain/models';

/** Persistence port. Adapters own authentication, tenancy and database mapping. */
export interface CalendarRepository {
  getYear(year: number): Promise<YearData | null>;
  saveYear(data: YearData): Promise<void>;
  saveDay(entry: CalendarEntry): Promise<void>;
  deleteDay(date: string): Promise<void>;
  saveYearConfig(config: YearConfig): Promise<void>;
}
