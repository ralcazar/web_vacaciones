import { describe, expect, it } from 'vitest';
import { calculateCounters, isWeekend } from '../src/domain/calendar';
import { emptyYear, loadOrCreateYear } from '../src/services/yearService';
import { InMemoryCalendarRepository } from '../src/repositories/InMemoryCalendarRepository';
import { exportYear, importYear, validateYearData } from '../src/services/jsonTransfer';
import { madridHolidays } from '../src/services/madridHolidays';

describe('categorías y contadores', () => {
  const config = { year: 2026, dayTypes: [{code:'TT',name:'Teletrabajo',limit:1,color:'#123456'},{code:'V60',name:'Vacaciones',limit:2,color:'#d97555'}] };
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
});

describe('JSON', () => {
  it('exporta e importa un año sin pérdida', () => { const value=emptyYear(2026); value.holidays.push({date:'2026-01-01',name:'Año Nuevo',scope:'national'}); expect(importYear(exportYear(value))).toEqual(value); });
  it('migra teletrabajo y ausencias de la versión anterior a categorías', () => {
    const migrated = validateYearData({version:1,year:2026,settings:{teleworkLimit:104},leaveTypes:[{code:'V60',name:'Vacaciones',limit:26,color:'#d97555'}],holidays:[],days:{'2026-01-02':{type:'telework'},'2026-01-03':{type:'leave',code:'V60'}}});
    expect(migrated.dayTypes.map(t => t.code)).toEqual(['TT','V60']);
    expect(migrated.days).toEqual({'2026-01-02':{type:'category',code:'TT'},'2026-01-03':{type:'category',code:'V60'}});
  });
  it('rechaza versión, fecha y categorías desconocidas', () => {
    expect(() => validateYearData({...emptyYear(2026),version:3})).toThrow('Versión');
    expect(() => validateYearData({...emptyYear(2026),holidays:[{date:'2027-01-01',name:'x',scope:'local'}]})).toThrow('festivo');
    expect(() => validateYearData({...emptyYear(2026),days:{'2026-02-02':{type:'category',code:'NO'}}})).toThrow('desconocido');
  });
});

describe('años y festivos', () => {
  it('incorpora los tres ámbitos del calendario oficial de Madrid', () => { const holidays=madridHolidays(2026); expect(holidays).toHaveLength(14); expect(new Set(holidays.map(h => h.scope))).toEqual(new Set(['national','regional','local'])); expect(holidays).toContainEqual({date:'2026-05-15',name:'San Isidro Labrador',scope:'local'}); });
  it('avisa cuando el calendario del año no está publicado', () => { expect(() => madridHolidays(2030)).toThrow('no está disponible'); });
  it('mantiene configuraciones independientes entre años', async () => { const repo=new InMemoryCalendarRepository(); const a=await loadOrCreateYear(repo,2026); a.dayTypes[0]!.limit=12; a.holidays.push({date:'2026-05-01',name:'Trabajo',scope:'national'}); await repo.saveYear(a); const b=await loadOrCreateYear(repo,2027); expect(b.dayTypes[0]!.limit).toBe(104); expect(b.holidays).toEqual([]); expect((await repo.getYear(2026))?.holidays).toHaveLength(1); });
  it('detecta fines de semana', () => { expect(isWeekend('2026-08-22')).toBe(true); expect(isWeekend('2026-08-24')).toBe(false); });
});
