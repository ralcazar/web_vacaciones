export type SchoolNonTeachingDay = { date: string; name: string };

type Period = [start: string, end: string, name: string];

// Referencia común para centros sostenidos con fondos públicos. Cada centro
// puede añadir días propios; estos datos nunca se guardan con el calendario.
const calendars: Record<number, Period[]> = {
  2025: [
    ['01-01', '01-07', 'Vacaciones de Navidad'], ['02-28', '03-03', 'Días no lectivos'],
    ['04-11', '04-21', 'Vacaciones de Semana Santa'], ['06-21', '09-07', 'Vacaciones de verano'],
    ['10-13', '10-13', 'Día no lectivo'], ['11-03', '11-03', 'Día no lectivo'],
    ['12-20', '12-31', 'Vacaciones de Navidad'],
  ],
  2026: [
    ['01-01', '01-07', 'Vacaciones de Navidad'], ['02-27', '03-02', 'Días no lectivos'],
    ['03-27', '04-06', 'Vacaciones de Semana Santa'], ['06-20', '09-07', 'Vacaciones de verano'],
    ['10-12', '10-12', 'Día no lectivo'], ['11-02', '11-02', 'Día no lectivo'],
    ['12-23', '12-31', 'Vacaciones de Navidad'],
  ],
};

export function madridSchoolNonTeachingDays(year: number): SchoolNonTeachingDay[] {
  const periods = calendars[year];
  if (!periods) throw new Error(`El calendario lectivo de la Comunidad de Madrid para ${year} no está disponible.`);
  return periods.flatMap(([start, end, name]) => {
    const current = new Date(`${year}-${start}T12:00:00Z`);
    const last = new Date(`${year}-${end}T12:00:00Z`);
    const days: SchoolNonTeachingDay[] = [];
    while (current <= last) {
      if (![0, 6].includes(current.getUTCDay())) days.push({ date: current.toISOString().slice(0, 10), name });
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return days;
  });
}
