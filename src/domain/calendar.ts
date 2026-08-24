import type { CalendarEntry, Counter, DayType, YearConfig } from './models';

export const HALF_LD_CODE = '1/2 LD';
export const HALF_LD_LIMIT = 6;
export const SAN_ISIDRO_CODE = 'SI';
export const TELEWORK_CODE = 'TT';
export const TELEWORK_MONTHLY_LIMIT = 10;

export function defaultUseUntil(year: number, code: string): string {
  if (code === 'SI') return `${year}-06-30`;
  if (code === 'V60') return `${year + 1}-02-${new Date(year + 1, 2, 0).getDate()}`;
  return `${year}-12-31`;
}

const RECURRING_HOLIDAYS: Record<string, string> = {
  '12-24': 'Nochebuena',
  '12-31': 'Nochevieja',
};

export function recurringHolidayName(date: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  return RECURRING_HOLIDAYS[date.slice(5)];
}

export const isRecurringHoliday = (date: string): boolean => recurringHolidayName(date) !== undefined;

export function canAddTeleworkDay(entries: CalendarEntry[], date: string): boolean {
  const month = date.slice(0, 7);
  return entries.filter(entry => entry.code === TELEWORK_CODE && entry.date.slice(0, 7) === month && entry.date !== date && !isRecurringHoliday(entry.date)).length < TELEWORK_MONTHLY_LIMIT;
}

export function isDayTypeAvailable(type: Pick<DayType, 'code' | 'useUntil'> | string, date: string, entitlementYear = Number(date.slice(0, 4))): boolean {
  const code = typeof type === 'string' ? type : type.code;
  const useUntil = typeof type === 'string' ? defaultUseUntil(entitlementYear, code) : type.useUntil;
  if (date < `${entitlementYear}-01-01` || date > useUntil) return false;
  return code !== SAN_ISIDRO_CODE || date >= `${entitlementYear}-05-16`;
}

export function calculateCounters(config: YearConfig, entries: CalendarEntry[]): Counter[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!isRecurringHoliday(entry.date)) counts.set(entry.code, (counts.get(entry.code) ?? 0) + 1);
  }
  return config.dayTypes.map(type => {
    // Up to three LD may be split into six half days. The half-day counter
    // enforces that cap, while the LD counter keeps showing the shared balance.
    const used = type.code === 'LD'
      ? (counts.get(type.code) ?? 0) + (counts.get(HALF_LD_CODE) ?? 0) / 2
      : counts.get(type.code) ?? 0;
    return { ...type, used, remaining: type.limit - used, exceeded: used > type.limit };
  });
}

export function calculateSummaryCounters(config: YearConfig, entries: CalendarEntry[]): Counter[] {
  return calculateCounters(config, entries).filter(counter => counter.code !== HALF_LD_CODE);
}

export const isWeekend = (date: string): boolean => [0, 6].includes(new Date(`${date}T12:00:00`).getDay());

export function nextDayTypeCode(dayTypes: DayType[], currentCode?: string, date?: string, entitlementYear?: number): string | undefined {
  if (date && isRecurringHoliday(date)) return undefined;
  const currentIndex = currentCode ? dayTypes.findIndex(type => type.code === currentCode) : -1;
  return dayTypes.slice(currentIndex + 1).find(type => !date || isDayTypeAvailable(type, date, entitlementYear ?? Number(date.slice(0, 4))))?.code;
}
