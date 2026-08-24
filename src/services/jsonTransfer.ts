import type { DayType, YearData } from '../domain/models';
import { canAddTeleworkDay, defaultUseUntil, isDayTypeAvailable, TELEWORK_CODE, TELEWORK_MONTHLY_LIMIT } from '../domain/calendar';
import type { CalendarEntry } from '../domain/models';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const dateInYear = (date: unknown, year: number) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number(date.slice(0, 4)) === year && !Number.isNaN(new Date(`${date}T12:00:00`).valueOf());
const validColor = (color: unknown): color is string => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color);

function migrateV1(input: Record<string, unknown>): unknown {
  if (input.version !== 1 || !isObject(input.settings) || !Array.isArray(input.leaveTypes) || !isObject(input.days)) return input;
  const telework: DayType = { code: 'TT', name: 'Teletrabajo', limit: Number(input.settings.teleworkLimit), color: validColor(input.settings.teleworkColor) ? input.settings.teleworkColor : '#327f77', useUntil: defaultUseUntil(Number(input.year), 'TT') };
  const dayTypes = [telework, ...input.leaveTypes.map(item => ({ ...(isObject(item) ? item : {}), color: isObject(item) && validColor(item.color) ? item.color : '#d97555' }))];
  const days = Object.fromEntries(Object.entries(input.days).map(([date, day]) => [date, isObject(day) && day.type === 'telework' ? { type: 'category', code: 'TT' } : isObject(day) && day.type === 'leave' ? { type: 'category', code: day.code } : day]));
  return { version: 2, year: input.year, dayTypes, holidays: input.holidays, days };
}

function migrateV2(input: unknown): unknown {
  if (!isObject(input) || input.version !== 2 || !Number.isInteger(input.year) || !Array.isArray(input.dayTypes)) return input;
  const year = input.year as number;
  return {
    ...input,
    version: 3,
    dayTypes: input.dayTypes.map(item => isObject(item) ? { ...item, useUntil: defaultUseUntil(year, String(item.code ?? '')) } : item),
  };
}

export function validateYearData(raw: unknown): YearData {
  const input = migrateV2(isObject(raw) ? migrateV1(raw) : raw);
  if (!isObject(input)) throw new Error('El archivo debe contener un objeto JSON.');
  if (input.version !== 3) throw new Error(`Versión no compatible: ${String(input.version)}.`);
  if (!Number.isInteger(input.year) || (input.year as number) < 1900 || (input.year as number) > 2200) throw new Error('El año no es válido.');
  const year = input.year as number;
  if (!Array.isArray(input.dayTypes) || !Array.isArray(input.holidays) || !isObject(input.days)) throw new Error('Faltan tipos, festivos o días.');
  const codes = new Set<string>();
  for (const item of input.dayTypes) {
    if (!isObject(item) || typeof item.code !== 'string' || !item.code.trim() || typeof item.name !== 'string' || !Number.isInteger(item.limit) || (item.limit as number) < 0 || !validColor(item.color) || typeof item.useUntil !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.useUntil) || Number.isNaN(new Date(`${item.useUntil}T12:00:00`).valueOf()) || item.useUntil < `${year}-01-01` || item.useUntil > `${year + 1}-12-31`) throw new Error('Hay un tipo de día no válido.');
    if (codes.has(item.code)) throw new Error(`El código ${item.code} está duplicado.`);
    codes.add(item.code);
  }
  for (const holiday of input.holidays) if (!isObject(holiday) || !dateInYear(holiday.date, year) || typeof holiday.name !== 'string' || !['national', 'regional', 'local'].includes(String(holiday.scope))) throw new Error('Hay un festivo no válido.');
  const entries: CalendarEntry[] = [];
  for (const [date, day] of Object.entries(input.days)) {
    const type = input.dayTypes.find(item => isObject(item) && item.code === (isObject(day) ? day.code : undefined));
    const validUsageDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T12:00:00`).valueOf()) && isObject(type) && typeof type.code === 'string' && typeof type.useUntil === 'string' && isDayTypeAvailable(type as Pick<DayType, 'code' | 'useUntil'>, date, year);
    if (!validUsageDate || !isObject(day) || day.type !== 'category' || typeof day.code !== 'string' || !codes.has(day.code)) throw new Error(`La entrada de ${date} no es válida, usa un tipo desconocido o está fuera de su periodo permitido.`);
    const entry: CalendarEntry = { date, type: 'category', code: day.code };
    if (entry.code === TELEWORK_CODE && !canAddTeleworkDay(entries, date)) throw new Error(`No se pueden añadir más de ${TELEWORK_MONTHLY_LIMIT} días de teletrabajo en un mismo mes.`);
    entries.push(entry);
  }
  return structuredClone(input) as YearData;
}

export const exportYear = (data: YearData): string => JSON.stringify(validateYearData(data), null, 2);
export const importYear = (json: string): YearData => { try { return validateYearData(JSON.parse(json)); } catch (e) { if (e instanceof SyntaxError) throw new Error('El archivo no contiene JSON válido.'); throw e; } };
