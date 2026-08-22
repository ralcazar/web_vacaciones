import type { Holiday, HolidayScope } from '../domain/models';

type HolidayTuple = [monthDay: string, name: string, scope: HolidayScope];

// Calendarios laborales publicados. Al estar incluidos en la aplicación, la
// importación también funciona sin conexión.
const calendars: Record<number, HolidayTuple[]> = {
  2025: [
    ['01-01','Año Nuevo','national'], ['01-06','Epifanía del Señor','national'], ['04-17','Jueves Santo','regional'],
    ['04-18','Viernes Santo','national'], ['05-01','Fiesta del Trabajo','national'], ['05-02','Fiesta de la Comunidad de Madrid','regional'],
    ['05-15','San Isidro Labrador','local'], ['07-25','Santiago Apóstol','regional'], ['08-15','Asunción de la Virgen','national'],
    ['11-01','Todos los Santos','national'], ['11-10','Nuestra Señora de la Almudena','local'], ['12-06','Día de la Constitución Española','national'],
    ['12-08','Inmaculada Concepción','national'], ['12-25','Natividad del Señor','national'],
  ],
  2026: [
    ['01-01','Año Nuevo','national'], ['01-06','Epifanía del Señor','national'], ['04-02','Jueves Santo','regional'],
    ['04-03','Viernes Santo','national'], ['05-01','Fiesta del Trabajo','national'], ['05-02','Fiesta de la Comunidad de Madrid','regional'],
    ['05-15','San Isidro Labrador','local'], ['08-15','Asunción de la Virgen','national'], ['10-12','Fiesta Nacional de España','national'],
    ['11-02','Todos los Santos (traslado)','regional'], ['11-09','Nuestra Señora de la Almudena','local'],
    ['12-07','Día de la Constitución Española (traslado)','regional'], ['12-08','Inmaculada Concepción','national'], ['12-25','Natividad del Señor','national'],
  ],
};

export function madridHolidays(year: number): Holiday[] {
  const calendar = calendars[year];
  if (!calendar) throw new Error(`El calendario oficial de Madrid para ${year} no está disponible.`);
  return calendar.map(([monthDay, name, scope]) => ({ date: `${year}-${monthDay}`, name, scope }));
}
