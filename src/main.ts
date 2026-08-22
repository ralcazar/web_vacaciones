import './styles.css';
import { calculateCounters, isWeekend } from './domain/calendar';
import type { CalendarEntry, DayType, HolidayScope, YearData } from './domain/models';
import { InMemoryCalendarRepository } from './repositories/InMemoryCalendarRepository';
import { exportYear, importYear } from './services/jsonTransfer';
import { madridHolidays } from './services/madridHolidays';
import { entriesOf, loadOrCreateYear, toConfig } from './services/yearService';

const repository = new InMemoryCalendarRepository();
let year = new Date().getFullYear();
let data: YearData;
let view: 'calendar' | 'settings' = 'calendar';
const app = document.querySelector<HTMLDivElement>('#app')!;
const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const week = ['L','M','X','J','V','S','D'];
const esc = (s: unknown) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

async function start() { data = await loadOrCreateYear(repository, year); render(); }
function dateKey(month: number, day: number) { return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
function monthMarkup(month: number) {
  const first = new Date(year, month, 1); const count = new Date(year, month + 1, 0).getDate();
  const blanks = (first.getDay() + 6) % 7; let cells = '<div class="week">' + week.map(d => `<span>${d}</span>`).join('') + '</div><div class="days">';
  cells += '<i></i>'.repeat(blanks);
  for (let day = 1; day <= count; day++) {
    const date = dateKey(month, day); const entry = data.days[date]; const holiday = data.holidays.find(h => h.date === date); const weekend = isWeekend(date);
    let label = ''; let style = ''; let cls = weekend ? 'weekend' : '';
    if (holiday) { cls += ` holiday holiday-${holiday.scope}`; label = holiday.name; }
    if (entry) { const type = data.dayTypes.find(t => t.code === entry.code); cls += ' category'; label = type?.name ?? entry.code; style = `--entry:${type?.color ?? '#d97555'}`; }
    cells += `<button class="day ${cls}" style="${style}" data-date="${date}" aria-label="${date}${label ? `, ${esc(label)}` : ''}"><b>${day}</b>${label ? `<small>${esc(label)}</small>` : ''}</button>`;
  }
  return `<article class="month"><h3>${months[month]}</h3>${cells}</div></article>`;
}
function countersMarkup() { return calculateCounters(toConfig(data), entriesOf(data)).map(c => `<div class="counter ${c.exceeded ? 'exceeded' : ''}"><span class="dot" style="background:${c.color ?? '#d97555'}"></span><strong>${esc(c.code)}</strong><span>${c.used} / ${c.limit}</span><small>${c.remaining >= 0 ? `${c.remaining} restantes` : `${Math.abs(c.remaining)} de más`}</small></div>`).join('') || '<p class="muted">Añade códigos en Configuración.</p>'; }
function shell(content: string) {
  app.innerHTML = `<header><div><p class="eyebrow">MI CALENDARIO</p><h1>Calendario laboral</h1></div><div class="year-picker"><button id="prev" aria-label="Año anterior">‹</button><strong>${year}</strong><button id="next" aria-label="Año siguiente">›</button></div></header><nav><button data-view="calendar" class="${view === 'calendar' ? 'active':''}">Calendario</button><button data-view="settings" class="${view === 'settings' ? 'active':''}">Configuración</button></nav>${content}<div id="modal"></div>`;
  app.querySelector('#prev')!.addEventListener('click', () => changeYear(year - 1)); app.querySelector('#next')!.addEventListener('click', () => changeYear(year + 1));
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view as typeof view; render(); });
}
function render() {
  if (view === 'settings') return renderSettings();
  shell(`<main><section class="summary"><div><p class="eyebrow">SALDOS ANUALES</p><h2>Tu año, de un vistazo</h2></div><div class="counters">${countersMarkup()}</div></section><section class="legend">${data.dayTypes.map(t => `<span><i class="lg" style="background:${t.color}"></i>${esc(t.name)}</span>`).join('')}<span><i class="lg holiday-national"></i>Festivo nacional</span><span><i class="lg holiday-regional"></i>Comunidad de Madrid</span><span><i class="lg holiday-local"></i>Ciudad de Madrid</span><span><i class="lg weekend"></i>Fin de semana</span></section><section class="calendar">${months.map((_,m) => monthMarkup(m)).join('')}</section></main>`);
  app.querySelectorAll<HTMLButtonElement>('.day').forEach(b => b.onclick = () => openDay(b.dataset.date!));
}
function openDay(date: string) {
  const modal = app.querySelector<HTMLDivElement>('#modal')!; const holiday = data.holidays.find(h => h.date === date); const blocked = holiday || isWeekend(date);
  modal.innerHTML = `<div class="backdrop"><section class="sheet"><button class="close">×</button><p class="eyebrow">${date}</p><h2>¿Cómo fue este día?</h2>${blocked ? `<p class="warning">⚠️ ${holiday ? `Es festivo: ${esc(holiday.name)}` : 'Es fin de semana'}. Puedes asignarlo, pero no es un día laborable.</p>` : ''}<div class="options"><button data-kind="normal">Día normal</button>${data.dayTypes.map(t => `<button data-kind="category" data-code="${esc(t.code)}"><i style="background:${t.color}"></i>${esc(t.code)} · ${esc(t.name)}</button>`).join('')}</div></section></div>`;
  modal.querySelector('.close')!.addEventListener('click', () => modal.innerHTML = '');
  modal.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach(b => b.onclick = async () => { if (b.dataset.kind === 'normal') { await repository.deleteDay(date); delete data.days[date]; } else { const entry = { date, type: 'category', code: b.dataset.code! } as CalendarEntry; await repository.saveDay(entry); const { date: _, ...day } = entry; data.days[date] = day; } render(); });
}
function renderSettings() {
  shell(`<main class="settings"><section><p class="eyebrow">CONFIGURACIÓN DE ${year}</p><h2>Tipos y saldos anuales</h2><p class="muted">Cada año tiene su propia lista de categorías, límites y colores.</p><div class="list">${data.dayTypes.map((t,i) => `<div class="list-row"><i style="background:${t.color}"></i><div><strong>${esc(t.code)}</strong><small>${esc(t.name)} · Límite ${t.limit}</small></div><button data-edit="${i}">Editar</button><button class="danger" data-remove="${i}" aria-label="Eliminar">×</button></div>`).join('')}</div><button class="primary" id="add-code">+ Añadir categoría</button></section><section><p class="eyebrow">FESTIVOS</p><h2>Fechas no laborables</h2><p class="muted">Añade de una vez los festivos nacionales, autonómicos y de la ciudad.</p><div class="holiday-key"><span><i class="lg holiday-national"></i>España</span><span><i class="lg holiday-regional"></i>Comunidad</span><span><i class="lg holiday-local"></i>Madrid</span></div><button class="primary import-holidays" id="import-holidays">Incorporar festivos de ${year}</button><div class="list">${data.holidays.sort((a,b) => a.date.localeCompare(b.date)).map((h,i) => `<div class="list-row holiday-item holiday-${h.scope}"><i></i><div><strong>${h.date.slice(5)}</strong><small>${esc(h.name)} · ${scopeName(h.scope)}</small></div><button class="danger" data-remove-holiday="${i}">×</button></div>`).join('') || '<p class="muted">Todavía no hay festivos.</p>'}</div><button class="secondary" id="add-holiday">+ Añadir festivo manualmente</button></section><section><p class="eyebrow">COPIA DE SEGURIDAD</p><h2>Importar y exportar</h2><p class="muted">El JSON contiene todo el año y no depende del futuro proveedor de datos.</p><div class="actions"><button class="secondary" id="export">Exportar JSON</button><label class="button secondary">Importar JSON<input id="import" type="file" accept="application/json"></label></div><p class="dev-note">Modo de desarrollo: repositorio en memoria. Los datos se reinician al recargar.</p></section></main>`);
  app.querySelector('#add-code')!.addEventListener('click', () => editCode()); app.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(b => b.onclick = () => editCode(Number(b.dataset.edit)));
  app.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(b => b.onclick = async () => { const type = data.dayTypes[Number(b.dataset.remove)]!; if (Object.values(data.days).some(d => d.code === type.code)) return alert('No puedes eliminar una categoría que tiene días asignados.'); data.dayTypes.splice(Number(b.dataset.remove),1); await saveConfig(); renderSettings(); });
  app.querySelector('#import-holidays')!.addEventListener('click', importMadridHolidays);
  app.querySelector('#add-holiday')!.addEventListener('click', addHoliday); app.querySelectorAll<HTMLButtonElement>('[data-remove-holiday]').forEach(b => b.onclick = async () => { data.holidays.splice(Number(b.dataset.removeHoliday),1); await repository.saveYear(data); renderSettings(); });
  app.querySelector('#export')!.addEventListener('click', download); app.querySelector<HTMLInputElement>('#import')!.onchange = handleImport;
}
const scopeName = (s: HolidayScope) => ({national:'Nacional',regional:'Comunidad de Madrid',local:'Ciudad de Madrid'}[s]);
async function importMadridHolidays() { try { const imported = madridHolidays(year); const byDate = new Map(data.holidays.map(h => [h.date, h])); imported.forEach(h => byDate.set(h.date, h)); data.holidays = [...byDate.values()].sort((a,b) => a.date.localeCompare(b.date)); await repository.saveYear(data); renderSettings(); } catch (error) { alert(error instanceof Error ? error.message : 'No se pudieron incorporar los festivos.'); } }
async function saveConfig() { await repository.saveYearConfig(toConfig(data)); }
function editCode(index?: number) {
  const old = index === undefined ? undefined : data.dayTypes[index]; const modal = app.querySelector<HTMLDivElement>('#modal')!;
  modal.innerHTML = `<div class="backdrop"><form class="sheet"><button type="button" class="close">×</button><h2>${old ? 'Editar' : 'Nuevo'} código</h2><label>Código<input name="code" maxlength="8" required value="${esc(old?.code ?? '')}"></label><label>Descripción<input name="name" required value="${esc(old?.name ?? '')}"></label><label>Límite anual<input name="limit" type="number" min="0" required value="${old?.limit ?? 1}"></label><label>Color<input name="color" type="color" value="${old?.color ?? '#d97555'}"></label><button class="primary">Guardar</button></form></div>`;
  modal.querySelector('.close')!.addEventListener('click', () => modal.innerHTML = ''); modal.querySelector('form')!.onsubmit = async e => { e.preventDefault(); const form = new FormData(e.currentTarget as HTMLFormElement); const item: DayType = { code: String(form.get('code')).trim().toUpperCase(), name: String(form.get('name')).trim(), limit: Number(form.get('limit')), color: String(form.get('color')) }; if (data.dayTypes.some((t,i) => t.code === item.code && i !== index)) return alert('Ese código ya existe.'); if (old && old.code !== item.code) Object.values(data.days).forEach(d => { if (d.code === old.code) d.code = item.code; }); if (index === undefined) data.dayTypes.push(item); else data.dayTypes[index] = item; await repository.saveYear(data); renderSettings(); };
}
function addHoliday() { const date = prompt(`Fecha del festivo (${year}-MM-DD)`); if (!date) return; if (!date.startsWith(`${year}-`) || Number.isNaN(new Date(`${date}T12:00:00`).valueOf())) return alert('La fecha no pertenece al año seleccionado.'); const name = prompt('Nombre del festivo'); if (!name) return; const scope = prompt('Ámbito: national, regional o local','local') as HolidayScope; if (!['national','regional','local'].includes(scope)) return alert('Ámbito no válido.'); data.holidays.push({date,name,scope}); repository.saveYear(data).then(renderSettings); }
function download() { const blob = new Blob([exportYear(data)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `calendario-${year}.json`; a.click(); URL.revokeObjectURL(a.href); }
async function handleImport(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; try { const imported = importYear(await file.text()); const current = await repository.getYear(imported.year); const summary = `${imported.year}: ${imported.dayTypes.length} categorías, ${imported.holidays.length} festivos y ${Object.keys(imported.days).length} días.`; if (!confirm(`Archivo válido. ${summary}\n${current ? 'Ya existen datos de ese año. ¿Quieres sobrescribirlos?' : '¿Quieres importarlo?'}`)) return; await repository.saveYear(imported); year = imported.year; data = imported; renderSettings(); } catch (err) { alert(err instanceof Error ? err.message : 'No se pudo importar.'); } }
async function changeYear(next: number) { year = next; data = await loadOrCreateYear(repository, year); render(); }
start();
