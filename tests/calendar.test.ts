import { describe, expect, it } from 'vitest';
import { calculateCounters, canAddTeleworkDay, isDayTypeAvailable, isRecurringHoliday, isWeekend, nextDayTypeCode, recurringHolidayName } from '../src/domain/calendar';
import { emptyYear, loadOrCreateYear } from '../src/services/yearService';
import { InMemoryCalendarRepository } from '../src/repositories/InMemoryCalendarRepository';
import { exportYear, importYear, validateYearData } from '../src/services/jsonTransfer';
import { madridHolidays } from '../src/services/madridHolidays';
import { madridJanuaryCalendar, madridJanuaryNonTeachingDays, madridSchoolNonTeachingDays } from '../src/services/madridSchoolCalendar';

describe('categorías y contadores', () => {
  const config = { year: 2026, dayTypes: [{code:'TT',name:'Teletrabajo',limit:1,color:'#123456',useUntil:'2026-12-31'},{code:'V60',name:'Vacaciones',limit:2,color:'#d97555',useUntil:'2027-02-28'}] };
  it('calcula todas las categorías de la misma manera', () => {
    const counters = calculateCounters(config, [{date:'2026-01-02',type:'category',code:'V60'},{date:'2026-01-03',type:'category',code:'TT'},{date:'2026-01-04',type:'category',code:'TT'}]);
    expect(counters[1]).toMatchObject({used:1,remaining:1,exceeded:false});
    expect(counters[0]).toMatchObject({used:2,remaining:-1,exceeded:true,color:'#123456'});
  });
  it('solo conserva una categoría por día', async () => {
    const repo = new InMemoryCalendarRepository(); await repo.saveYear(emptyYear(2026));
    await repo.saveDay({date:'2026-02-02',type:'category',code:'TT'});
    await repo.saveDay({date:'2026-02-02',type:'category',code:'V60'});
    expect((await repo.getYear(2026))?.days['2026-02-02']).toEqual({type:'category',code:'V60'});
  });
  it('limita el teletrabajo a diez días en un mismo mes', async () => {
    const entries = Array.from({length: 10}, (_, index) => ({date:`2026-01-${String(index + 1).padStart(2, '0')}`,type:'category' as const,code:'TT'}));
    expect(canAddTeleworkDay(entries, '2026-01-11')).toBe(false);
    expect(canAddTeleworkDay(entries, '2026-02-01')).toBe(true);

    const repo = new InMemoryCalendarRepository(); await repo.saveYear(emptyYear(2026));
    for (const entry of entries) await repo.saveDay(entry);
    await expect(repo.saveDay({date:'2026-01-11',type:'category',code:'TT'})).rejects.toThrow('10 días');
  });
  it('recorre las categorías en orden y después deja el día sin categoría', () => {
    expect(nextDayTypeCode(config.dayTypes)).toBe('TT');
    expect(nextDayTypeCode(config.dayTypes, 'TT')).toBe('V60');
    expect(nextDayTypeCode(config.dayTypes, 'V60')).toBeUndefined();
  });
  it('crea el año con las categorías y saldos predeterminados en el orden esperado', () => {
    const types = emptyYear(2026).dayTypes;
    expect(types.map(type => type.code)).toEqual(['V60', 'TT', 'SAB', 'HIJO', 'ANT', 'LD', '1/2 LD', 'SI']);
    expect(types.find(type => type.code === 'SAB')).toMatchObject({name:'Compensación sábados festivos',limit:2});
    expect(types.find(type => type.code === 'HIJO')).toMatchObject({name:'Hijo < 12 años',limit:1});
    expect(types.find(type => type.code === 'ANT')).toMatchObject({name:'Antigüedad',limit:0});
    expect(nextDayTypeCode(emptyYear(2026).dayTypes)).toBe('V60');
  });
  it('limita San Isidro a un día entre el 16 de mayo y el 30 de junio', () => {
    const types = emptyYear(2026).dayTypes;
    expect(types.find(type => type.code === 'SI')).toMatchObject({name:'San Isidro',limit:1});
    expect(isDayTypeAvailable('SI', '2026-05-15')).toBe(false);
    expect(isDayTypeAvailable('SI', '2026-05-16')).toBe(true);
    expect(isDayTypeAvailable('SI', '2026-06-30')).toBe(true);
    expect(isDayTypeAvailable('SI', '2026-07-01')).toBe(false);
    expect(nextDayTypeCode(types, '1/2 LD', '2026-05-15')).toBeUndefined();
    expect(nextDayTypeCode(types, '1/2 LD', '2026-05-16')).toBe('SI');
  });
  it('descuenta los medios LD del saldo compartido y limita su división a seis medios días', () => {
    const config = { year: 2026, dayTypes: emptyYear(2026).dayTypes };
    const entries = [
      ...['02', '03'].map(day => ({date:`2026-01-${day}`,type:'category' as const,code:'LD'})),
      ...['04', '05', '06', '07', '08', '09'].map(day => ({date:`2026-01-${day}`,type:'category' as const,code:'1/2 LD'})),
    ];
    const counters = calculateCounters(config, entries);
    expect(counters.find(counter => counter.code === 'LD')).toMatchObject({used:5,remaining:0,exceeded:false});
    expect(counters.find(counter => counter.code === '1/2 LD')).toMatchObject({used:6,limit:6,remaining:0,exceeded:false});
  });
});

describe('JSON', () => {
  it('exporta e importa un año sin pérdida', () => { const value=emptyYear(2026); value.holidays.push({date:'2026-01-01',name:'Año Nuevo',scope:'national'}); expect(importYear(exportYear(value))).toEqual(value); });
  it('migra teletrabajo y ausencias de la versión anterior a categorías', () => {
    const migrated = validateYearData({version:1,year:2026,settings:{teleworkLimit:104},leaveTypes:[{code:'V60',name:'Vacaciones',limit:26,color:'#d97555'}],holidays:[],days:{'2026-01-02':{type:'telework'},'2026-01-03':{type:'leave',code:'V60'}}});
    expect(migrated.dayTypes.map(t => t.code)).toEqual(['TT','V60']);
    expect(migrated.days).toEqual({'2026-01-02':{type:'category',code:'TT'},'2026-01-03':{type:'category',code:'V60'}});
  });
  it('rechaza versión, fecha y categorías desconocidas', () => {
    expect(() => validateYearData({...emptyYear(2026),version:4})).toThrow('Versión');
    expect(() => validateYearData({...emptyYear(2026),holidays:[{date:'2027-01-01',name:'x',scope:'local'}]})).toThrow('festivo');
    expect(() => validateYearData({...emptyYear(2026),days:{'2026-02-02':{type:'category',code:'NO'}}})).toThrow('desconocido');
    expect(() => validateYearData({...emptyYear(2026),days:{'2026-05-15':{type:'category',code:'SI'}}})).toThrow('periodo permitido');
    const tooManyTeleworkDays = Object.fromEntries(Array.from({length: 11}, (_, index) => [`2026-01-${String(index + 1).padStart(2, '0')}`, {type:'category',code:'TT'}]));
    expect(() => validateYearData({...emptyYear(2026),days:tooManyTeleworkDays})).toThrow('10 días');
  });
});

describe('años y festivos', () => {
  it('carga los días no lectivos de Madrid como datos visuales independientes', () => {
    const days = madridSchoolNonTeachingDays(2026);
    expect(days).toContainEqual({date:'2026-02-27',name:'Día no lectivo'});
    expect(days).toContainEqual({date:'2026-03-30',name:'Vacaciones de Semana Santa'});
    expect(() => madridSchoolNonTeachingDays(2030)).toThrow('no está disponible');
  });
  it('incorpora los tres ámbitos del calendario oficial de Madrid', () => { const holidays=madridHolidays(2026); expect(holidays).toHaveLength(14); expect(new Set(holidays.map(h => h.scope))).toEqual(new Set(['national','regional','local'])); expect(holidays).toContainEqual({date:'2026-05-15',name:'San Isidro Labrador',scope:'local'}); });
  it('en enero siguiente solo marca permanentemente los festivos normales', () => {
    const january = madridJanuaryCalendar(2027);
    expect(january.holidays.map(day => day.date)).toEqual(['2027-01-01', '2027-01-06']);
    expect(january).not.toHaveProperty('schoolDays');
    expect(madridJanuaryNonTeachingDays(2027).map(day => day.date)).toEqual(['2027-01-07', '2027-01-08']);
  });
  it('solo permite V60 en enero del año siguiente según la fecha límite de cada categoría', async () => {
    const data = emptyYear(2026);
    expect(nextDayTypeCode(data.dayTypes, undefined, '2027-01-11', 2026)).toBe('V60');
    expect(nextDayTypeCode(data.dayTypes, 'V60', '2027-01-11', 2026)).toBeUndefined();
    expect(nextDayTypeCode(data.dayTypes, undefined, '2027-03-01', 2026)).toBeUndefined();
    const repo = new InMemoryCalendarRepository(); await repo.saveYear(data);
    await repo.saveDay({date:'2027-01-11',type:'category',code:'V60'}, 2026);
    await expect(repo.saveDay({date:'2027-01-12',type:'category',code:'TT'}, 2026)).rejects.toThrow('periodo');
    expect((await repo.getYear(2026))?.days['2027-01-11']).toEqual({type:'category',code:'V60'});
  });
  it('avisa cuando el calendario del año no está publicado', () => { expect(() => madridHolidays(2030)).toThrow('no está disponible'); });
  it('mantiene configuraciones independientes entre años', async () => { const repo=new InMemoryCalendarRepository(); const a=await loadOrCreateYear(repo,2026); a.dayTypes.find(type => type.code === 'TT')!.limit=12; a.holidays.push({date:'2026-05-01',name:'Trabajo',scope:'national'}); await repo.saveYear(a); const b=await loadOrCreateYear(repo,2027); expect(b.dayTypes.find(type => type.code === 'TT')!.limit).toBe(104); expect(b.holidays).toEqual([]); expect((await repo.getYear(2026))?.holidays).toHaveLength(1); });
  it('detecta fines de semana', () => { expect(isWeekend('2026-08-22')).toBe(true); expect(isWeekend('2026-08-24')).toBe(false); });
  it('marca el 24 y el 31 de diciembre como festivos fijos en cualquier año', () => {
    expect(recurringHolidayName('2026-12-24')).toBe('Nochebuena');
    expect(recurringHolidayName('2030-12-31')).toBe('Nochevieja');
    expect(isRecurringHoliday('2025-12-23')).toBe(false);
    expect(nextDayTypeCode(emptyYear(2026).dayTypes, undefined, '2026-12-24')).toBeUndefined();
  });
  it('no descuenta saldo por códigos antiguos en los festivos fijos', () => {
    const counters = calculateCounters(
      { year: 2026, dayTypes: emptyYear(2026).dayTypes },
      [{ date: '2026-12-24', type: 'category', code: 'V60' }, { date: '2026-12-23', type: 'category', code: 'V60' }],
    );
    expect(counters.find(counter => counter.code === 'V60')).toMatchObject({ used: 1, remaining: 25 });
  });
});
