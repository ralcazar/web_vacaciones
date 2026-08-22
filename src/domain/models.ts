export type HolidayScope = 'national' | 'regional' | 'local';
export type Holiday = { date: string; name: string; scope: HolidayScope };
export type DayType = { code: string; name: string; limit: number; color: string };
export type CalendarEntry = { date: string; type: 'category'; code: string };
export type DayEntry = { type: 'category'; code: string };
export type YearConfig = { year: number; dayTypes: DayType[] };
export type YearData = {
  version: 2;
  year: number;
  dayTypes: DayType[];
  holidays: Holiday[];
  days: Record<string, DayEntry>;
};
export type Counter = { code: string; name: string; used: number; limit: number; remaining: number; exceeded: boolean; color: string };
