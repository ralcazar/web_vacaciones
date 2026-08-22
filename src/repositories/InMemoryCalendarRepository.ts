import type { CalendarEntry, YearConfig, YearData } from '../domain/models';
import type { CalendarRepository } from './CalendarRepository';

const copy = <T>(value: T): T => structuredClone(value);

export class InMemoryCalendarRepository implements CalendarRepository {
  private years = new Map<number, YearData>();
  async getYear(year: number) { const value = this.years.get(year); return value ? copy(value) : null; }
  async saveYear(data: YearData) { this.years.set(data.year, copy(data)); }
  async saveDay(entry: CalendarEntry) {
    const year = Number(entry.date.slice(0, 4));
    const data = this.requireYear(year);
    const { date, ...day } = entry;
    data.days[date] = day;
  }
  async deleteDay(date: string) { delete this.requireYear(Number(date.slice(0, 4))).days[date]; }
  async saveYearConfig(config: YearConfig) {
    const data = this.requireYear(config.year);
    data.settings.teleworkLimit = config.teleworkLimit;
    data.leaveTypes = copy(config.leaveTypes);
  }
  private requireYear(year: number) {
    const data = this.years.get(year);
    if (!data) throw new Error(`El año ${year} no existe`);
    return data;
  }
}
