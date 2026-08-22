import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalendarEntry, DayType, Holiday, YearConfig, YearData } from '../domain/models';
import type { CalendarRepository } from './CalendarRepository';

type YearRow = { year: number };
type TypeRow = { code: string; name: string; annual_limit: number; color: string; position: number };
type HolidayRow = { date: string; name: string; scope: Holiday['scope'] };
type DayRow = { date: string; leave_code: string };

export class SupabaseCalendarRepository implements CalendarRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getYear(year: number): Promise<YearData | null> {
    const { data: yearRow, error: yearError } = await this.client.from('years').select('year').eq('year', year).maybeSingle<YearRow>();
    if (yearError) throw yearError;
    if (!yearRow) return null;
    const [typesResult, holidaysResult, daysResult] = await Promise.all([
      this.client.from('leave_types').select('code,name,annual_limit,color,position').eq('year', year).order('position'),
      this.client.from('holidays').select('date,name,scope').eq('year', year).order('date'),
      this.client.from('calendar_entries').select('date,leave_code').eq('year', year),
    ]);
    if (typesResult.error) throw typesResult.error;
    if (holidaysResult.error) throw holidaysResult.error;
    if (daysResult.error) throw daysResult.error;
    const dayTypes: DayType[] = (typesResult.data as TypeRow[]).map(row => ({ code: row.code, name: row.name, limit: row.annual_limit, color: row.color }));
    const days = Object.fromEntries((daysResult.data as DayRow[]).map(row => [row.date, { type: 'category' as const, code: row.leave_code }]));
    return { version: 2, year: yearRow.year, dayTypes, holidays: holidaysResult.data as HolidayRow[], days };
  }

  async saveYear(data: YearData): Promise<void> {
    const { error } = await this.client.rpc('save_calendar_year', { payload: data });
    if (error) throw error;
  }

  async saveDay(entry: CalendarEntry): Promise<void> {
    const { error } = await this.client.from('calendar_entries').upsert({
      year: Number(entry.date.slice(0, 4)), date: entry.date, leave_code: entry.code,
    }, { onConflict: 'user_id,date' });
    if (error) throw error;
  }

  async deleteDay(date: string): Promise<void> {
    const { error } = await this.client.from('calendar_entries').delete().eq('date', date);
    if (error) throw error;
  }

  async saveYearConfig(config: YearConfig): Promise<void> {
    const current = await this.getYear(config.year);
    if (!current) throw new Error(`El año ${config.year} no existe`);
    await this.saveYear({ ...current, dayTypes: config.dayTypes });
  }
}
