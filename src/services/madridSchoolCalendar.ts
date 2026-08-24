export interface SchoolNonTeachingDay {
  date: string;
  name: string;
}

type SchoolDayTuple = [monthDay: string, name: string];

// Días comunes a colegios e institutos en los calendarios escolares publicados
// por la Comunidad de Madrid. No se incluyen las vacaciones de verano porque
// las fechas de inicio y fin varían según la etapa educativa.
const calendars: Record<number, SchoolDayTuple[]> = {
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

export function madridSchoolNonTeachingDays(year: number): SchoolNonTeachingDay[] {
  const calendar = calendars[year];
  if (!calendar) throw new Error(`El calendario lectivo de la Comunidad de Madrid para ${year} no está disponible.`);
  return calendar.map(([monthDay, name]) => ({ date: `${year}-${monthDay}`, name }));
}
