export type HolidayScope = 'national' | 'regional' | 'local';
export type Holiday = { date: string; name: string; scope: HolidayScope };
export type LeaveType = { code: string; name: string; limit: number; color?: string };
export type CalendarEntry =
  | { date: string; type: 'telework' }
  | { date: string; type: 'leave'; code: string };
export type DayEntry = { type: 'telework' } | { type: 'leave'; code: string };
export type YearConfig = { year: number; teleworkLimit: number; leaveTypes: LeaveType[] };
export type YearData = {
  version: 1;
  year: number;
  settings: { teleworkLimit: number };
  leaveTypes: LeaveType[];
  holidays: Holiday[];
  days: Record<string, DayEntry>;
};
export type Counter = { code: string; name: string; used: number; limit: number; remaining: number; exceeded: boolean; color?: string };
