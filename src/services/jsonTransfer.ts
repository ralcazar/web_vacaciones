import type { YearData } from '../domain/models';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const dateInYear = (date: unknown, year: number) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number(date.slice(0, 4)) === year && !Number.isNaN(new Date(`${date}T12:00:00`).valueOf());

export function validateYearData(input: unknown): YearData {
  if (!isObject(input)) throw new Error('El archivo debe contener un objeto JSON.');
  if (input.version !== 1) throw new Error(`Versión no compatible: ${String(input.version)}.`);
  if (!Number.isInteger(input.year) || (input.year as number) < 1900 || (input.year as number) > 2200) throw new Error('El año no es válido.');
  const year = input.year as number;
  if (!isObject(input.settings) || !Number.isInteger(input.settings.teleworkLimit) || (input.settings.teleworkLimit as number) < 0) throw new Error('El límite de teletrabajo no es válido.');
  if (!Array.isArray(input.leaveTypes) || !Array.isArray(input.holidays) || !isObject(input.days)) throw new Error('Faltan códigos, festivos o días.');
  const codes = new Set<string>();
  for (const item of input.leaveTypes) {
    if (!isObject(item) || typeof item.code !== 'string' || !item.code.trim() || typeof item.name !== 'string' || !Number.isInteger(item.limit) || (item.limit as number) < 0) throw new Error('Hay un código de ausencia no válido.');
    if (codes.has(item.code)) throw new Error(`El código ${item.code} está duplicado.`);
    codes.add(item.code);
  }
  for (const holiday of input.holidays) if (!isObject(holiday) || !dateInYear(holiday.date, year) || typeof holiday.name !== 'string' || !['national', 'regional', 'local'].includes(String(holiday.scope))) throw new Error('Hay un festivo no válido.');
  for (const [date, day] of Object.entries(input.days)) {
    if (!dateInYear(date, year) || !isObject(day) || !['telework', 'leave'].includes(String(day.type))) throw new Error(`La entrada de ${date} no es válida.`);
    if (day.type === 'leave' && (typeof day.code !== 'string' || !codes.has(day.code))) throw new Error(`La entrada de ${date} usa un código desconocido.`);
  }
  return structuredClone(input) as YearData;
}

export const exportYear = (data: YearData): string => JSON.stringify(validateYearData(data), null, 2);
export const importYear = (json: string): YearData => { try { return validateYearData(JSON.parse(json)); } catch (e) { if (e instanceof SyntaxError) throw new Error('El archivo no contiene JSON válido.'); throw e; } };
