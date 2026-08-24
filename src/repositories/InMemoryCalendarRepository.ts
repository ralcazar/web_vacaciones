import type { CalendarEntry, YearConfig, YearData } from '../domain/models';
import type { CalendarRepository } from './CalendarRepository';
import { canAddTeleworkDay, isDayTypeAvailable, TELEWORK_CODE, TELEWORK_MONTHLY_LIMIT } from '../domain/calendar';
import { entriesOf } from '../services/yearService';

const copy = <T>(value: T): T => structuredClone(value);

export class InMemoryCalendarRepository implements CalendarRepository {
  private years = new Map<number, YearData>();
  async getYear(year: number) { const value = this.years.get(year); return value ? copy(value) : null; }
  async saveYear(data: YearData) { this.years.set(data.year, copy(data)); }
  async saveDay(entry: CalendarEntry, entitlementYear = Number(entry.date.slice(0, 4))) {
    const data = this.requireYear(entitlementYear);
    const type = data.dayTypes.find(item => item.code === entry.code);
    if (!type || !isDayTypeAvailable(type, entry.date, entitlementYear)) throw new Error('La fecha está fuera del periodo de uso de la categoría.');
    if (entry.code === TELEWORK_CODE && !canAddTeleworkDay(entriesOf(data), entry.date)) throw new Error(`No se pueden añadir más de ${TELEWORK_MONTHLY_LIMIT} días de teletrabajo en un mismo mes.`);
    const { date, ...day } = entry;
    data.days[date] = day;
  }
  async deleteDay(date: string, entitlementYear = Number(date.slice(0, 4))) { delete this.requireYear(entitlementYear).days[date]; }
  async saveYearConfig(config: YearConfig) { this.requireYear(config.year).dayTypes = copy(config.dayTypes); }
  private requireYear(year: number) {
    const data = this.years.get(year);
    if (!data) throw new Error(`El año ${year} no existe`);
    return data;
  }
}
