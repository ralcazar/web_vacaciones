import type { Holiday } from '../domain/models';

export interface SchoolNonTeachingDay {
  date: string;
  name: string;
}

export type SchoolDay = SchoolNonTeachingDay & {
  kind: 'school-break' | 'non-teaching';
};

type SchoolDayTuple = [monthDay: string, name: string];
type JanuaryCalendar = { holidays: Holiday[]; schoolDays: SchoolDay[] };

// Días comunes a colegios e institutos en los calendarios escolares publicados
// por la Comunidad de Madrid. No se incluyen las vacaciones de verano porque
// las fechas de inicio y fin varían según la etapa educativa.
const schoolCalendars: Record<number, SchoolDayTuple[]> = {
  2025: [
    ['01-02', 'Vacaciones de Navidad'], ['01-03', 'Vacaciones de Navidad'],
    ['01-07', 'Vacaciones de Navidad'], ['02-28', 'Día no lectivo'],
    ['03-03', 'Día no lectivo'], ['04-11', 'Vacaciones de Semana Santa'],
    ['04-14', 'Vacaciones de Semana Santa'], ['04-15', 'Vacaciones de Semana Santa'],
    ['04-16', 'Vacaciones de Semana Santa'], ['04-21', 'Vacaciones de Semana Santa'],
    ['10-13', 'Día no lectivo'], ['11-03', 'Día no lectivo'],
    ['12-22', 'Vacaciones de Navidad'], ['12-23', 'Vacaciones de Navidad'],
    ['12-26', 'Vacaciones de Navidad'], ['12-29', 'Vacaciones de Navidad'],
    ['12-30', 'Vacaciones de Navidad'],
  ],
  2026: [
    ['01-02', 'Vacaciones de Navidad'], ['01-05', 'Vacaciones de Navidad'],
    ['01-07', 'Vacaciones de Navidad'], ['02-27', 'Día no lectivo'],
    ['03-02', 'Día no lectivo'], ['03-27', 'Vacaciones de Semana Santa'],
    ['03-30', 'Vacaciones de Semana Santa'], ['03-31', 'Vacaciones de Semana Santa'],
    ['04-01', 'Vacaciones de Semana Santa'], ['04-06', 'Vacaciones de Semana Santa'],
    ['10-13', 'Día no lectivo'], ['11-02', 'Día no lectivo'],
    ['12-07', 'Día no lectivo'], ['12-23', 'Vacaciones de Navidad'],
    ['12-28', 'Vacaciones de Navidad'], ['12-29', 'Vacaciones de Navidad'],
    ['12-30', 'Vacaciones de Navidad'],
  ],
};

// Fechas de enero publicadas para los cursos 2025/2026 y 2026/2027. Los días
// no lectivos indicados también se aplican en Madrid capital.
const januaryCalendars: Record<number, JanuaryCalendar> = {
  2026: {
    holidays: [
      { date: '2026-01-01', name: 'Año Nuevo', scope: 'national' },
      { date: '2026-01-06', name: 'Epifanía del Señor', scope: 'national' },
    ],
    schoolDays: [
      ...Array.from({ length: 6 }, (_, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, name: 'Vacaciones escolares de Navidad', kind: 'school-break' as const })),
      { date: '2026-01-07', name: 'Día no lectivo · Comunidad y Madrid capital', kind: 'non-teaching' },
    ],
  },
  2027: {
    holidays: [
      { date: '2027-01-01', name: 'Año Nuevo', scope: 'national' },
      { date: '2027-01-06', name: 'Epifanía del Señor', scope: 'national' },
    ],
    schoolDays: [
      ...Array.from({ length: 6 }, (_, index) => ({ date: `2027-01-${String(index + 1).padStart(2, '0')}`, name: 'Vacaciones escolares de Navidad', kind: 'school-break' as const })),
      { date: '2027-01-07', name: 'Día no lectivo · Comunidad y Madrid capital', kind: 'non-teaching' },
      { date: '2027-01-08', name: 'Día no lectivo · Comunidad y Madrid capital', kind: 'non-teaching' },
    ],
  },
};

export function madridSchoolNonTeachingDays(year: number): SchoolNonTeachingDay[] {
  const calendar = schoolCalendars[year];
  if (!calendar) throw new Error(`El calendario lectivo de la Comunidad de Madrid para ${year} no está disponible.`);
  return calendar.map(([monthDay, name]) => ({ date: `${year}-${monthDay}`, name }));
}

export function madridJanuaryCalendar(year: number): JanuaryCalendar {
  return januaryCalendars[year] ?? { holidays: [], schoolDays: [] };
}
