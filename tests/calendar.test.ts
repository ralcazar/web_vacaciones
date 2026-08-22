import { describe, expect, it } from 'vitest';
import { calculateCounters, isWeekend } from '../src/domain/calendar';
import { emptyYear, loadOrCreateYear } from '../src/services/yearService';
import { InMemoryCalendarRepository } from '../src/repositories/InMemoryCalendarRepository';
import { exportYear, importYear, validateYearData } from '../src/services/jsonTransfer';

describe('contadores', () => {
  const config = { year: 2026, teleworkLimit: 1, leaveTypes: [{code:'V60',name:'Vacaciones',limit:2}] };
  it('calcula usados, restantes y excesos', () => {
    const counters = calculateCounters(config, [{date:'2026-01-02',type:'leave',code:'V60'},{date:'2026-01-03',type:'telework'},{date:'2026-01-04',type:'telework'}]);
    expect(counters[1]).toMatchObject({used:1,remaining:1,exceeded:false});
    expect(counters[0]).toMatchObject({used:2,remaining:-1,exceeded:true});
  });
});

describe('JSON', () => {
  it('exporta e importa un año sin pérdida', () => { const value=emptyYear(2026); value.holidays.push({date:'2026-01-01',name:'Año Nuevo',scope:'national'}); expect(importYear(exportYear(value))).toEqual(value); });
  it('rechaza versión, fecha y códigos desconocidos', () => {
    expect(() => validateYearData({...emptyYear(2026),version:2})).toThrow('Versión');
    expect(() => validateYearData({...emptyYear(2026),holidays:[{date:'2027-01-01',name:'x',scope:'local'}]})).toThrow('festivo');
    expect(() => validateYearData({...emptyYear(2026),days:{'2026-02-02':{type:'leave',code:'NO'}}})).toThrow('desconocido');
  });
});

describe('años y festivos', () => {
  it('mantiene configuraciones independientes entre años', async () => { const repo=new InMemoryCalendarRepository(); const a=await loadOrCreateYear(repo,2026); a.settings.teleworkLimit=12; a.holidays.push({date:'2026-05-01',name:'Trabajo',scope:'national'}); await repo.saveYear(a); const b=await loadOrCreateYear(repo,2027); expect(b.settings.teleworkLimit).toBe(104); expect(b.holidays).toEqual([]); expect((await repo.getYear(2026))?.holidays).toHaveLength(1); });
  it('detecta fines de semana', () => { expect(isWeekend('2026-08-22')).toBe(true); expect(isWeekend('2026-08-24')).toBe(false); });
});
