import './styles.css';
import { calculateCounters, canAddTeleworkDay, isRecurringHoliday, isWeekend, nextDayTypeCode, recurringHolidayName, TELEWORK_CODE, TELEWORK_MONTHLY_LIMIT } from './domain/calendar';
import type { CalendarEntry, DayType, HolidayScope, YearData } from './domain/models';
import type { CalendarRepository } from './repositories/CalendarRepository';
import { SupabaseCalendarRepository } from './repositories/SupabaseCalendarRepository';
import { exportYear, importYear } from './services/jsonTransfer';
import { madridHolidays } from './services/madridHolidays';
import { madridSchoolNonTeachingDays, type SchoolNonTeachingDay } from './services/madridSchoolCalendar';
import { entriesOf, loadOrCreateYear, toConfig } from './services/yearService';
import { hasSupabaseConfig, supabase } from './services/supabase';

let repository: CalendarRepository;
let year = new Date().getFullYear();
let data: YearData;
let view: 'calendar' | 'settings' = 'calendar';
let schoolCalendarVisible = false;
let schoolNonTeachingDays: SchoolNonTeachingDay[] = [];
const app = document.querySelector<HTMLDivElement>('#app')!;
const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const week = ['L','M','X','J','V','S','D'];
const esc = (s: unknown) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

async function start() {
  if (!hasSupabaseConfig || !supabase) return renderMissingConfig();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return renderLogin();
  repository = new SupabaseCalendarRepository(supabase);
  try { data = await loadOrCreateYear(repository, year); render(); }
  catch (error) { renderFatal(error); }
}
function dateKey(month: number, day: number) { return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; }
function monthMarkup(month: number) {
  const first = new Date(year, month, 1); const count = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const teleworkDays = Object.entries(data.days).filter(([date, entry]) => date.startsWith(monthPrefix) && entry.code === TELEWORK_CODE && !isRecurringHoliday(date)).length;
  const blanks = (first.getDay() + 6) % 7; let cells = '<div class="week">' + week.map(d => `<span>${d}</span>`).join('') + '</div><div class="days">';
  cells += '<i></i>'.repeat(blanks);
  for (let day = 1; day <= count; day++) {
    const date = dateKey(month, day); const recurringName = recurringHolidayName(date); const entry = recurringName ? undefined : data.days[date]; const holiday = data.holidays.find(h => h.date === date); const weekend = isWeekend(date); const schoolDay = schoolCalendarVisible ? schoolNonTeachingDays.find(item => item.date === date) : undefined;
    let label = ''; let accessibleLabel = ''; let style = ''; let cls = weekend ? 'weekend' : '';
    if (holiday) { cls += ` holiday holiday-${holiday.scope}`; label = holiday.name; accessibleLabel = holiday.name; }
    if (recurringName) { cls += ' holiday holiday-recurring'; label = recurringName; accessibleLabel = `${recurringName}, festivo fijo`; }
    if (entry) { const type = data.dayTypes.find(t => t.code === entry.code); cls += ' category'; label = entry.code; accessibleLabel = type?.name ?? entry.code; style = `--entry:${type?.color ?? '#d97555'}`; }
    if (schoolDay) { cls += ' school-non-teaching'; accessibleLabel = `${accessibleLabel ? `${accessibleLabel}, ` : ''}${schoolDay.name}, no lectivo`; }
    cells += `<button class="day ${cls}" style="${style}" data-date="${date}" aria-label="${date}${accessibleLabel ? `, ${esc(accessibleLabel)}` : ''}"${recurringName ? ' disabled' : ''}><b>${day}</b>${label ? `<small>${esc(label)}</small>` : ''}</button>`;
  }
  return `<article class="month"><div class="month-heading"><h3>${months[month]}</h3><span>Teletrabajo: <strong>${teleworkDays}</strong> ${teleworkDays === 1 ? 'día' : 'días'}</span></div>${cells}</div></article>`;
}
function countersMarkup() {
  const counters = calculateCounters(toConfig(data), entriesOf(data));
  if (!counters.length) return '<p class="muted">Añade códigos en Configuración.</p>';
  return `<div class="summary-table-wrap"><table class="summary-table"><thead><tr><th>Código</th><th>Días de saldo</th><th>Días restantes</th></tr></thead><tbody>${counters.map(c => `<tr class="${c.exceeded ? 'exceeded' : ''}"><td><span class="dot" style="background:${c.color ?? '#d97555'}"></span><strong>${esc(c.code)}</strong></td><td>${c.limit}</td><td>${c.remaining}</td></tr>`).join('')}</tbody></table></div>`;
}
function shell(content: string) {
  app.innerHTML = `<header><div><p class="eyebrow">MI CALENDARIO</p><h1>Calendario laboral</h1></div><div class="header-actions"><div class="year-picker"><button id="prev" aria-label="Año anterior">‹</button><strong>${year}</strong><button id="next" aria-label="Año siguiente">›</button></div><button id="logout" class="logout">Salir</button></div></header><nav><button data-view="calendar" class="${view === 'calendar' ? 'active':''}">Calendario</button><button data-view="settings" class="${view === 'settings' ? 'active':''}">Configuración</button></nav>${content}<div id="modal"></div>`;
  app.querySelector('#prev')!.addEventListener('click', () => changeYear(year - 1)); app.querySelector('#next')!.addEventListener('click', () => changeYear(year + 1));
  app.querySelector('#logout')!.addEventListener('click', async () => { await supabase?.auth.signOut(); renderLogin(); });
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.onclick = () => { view = b.dataset.view as typeof view; render(); });
}
function render() {
  if (view === 'settings') return renderSettings();
  shell(`<main><section class="summary"><div><p class="eyebrow">SALDOS ANUALES</p><h2>Tu año, de un vistazo</h2></div>${countersMarkup()}</section><div class="calendar-tools"><button class="secondary school-calendar-button ${schoolCalendarVisible ? 'active' : ''}" id="school-calendar" aria-pressed="${schoolCalendarVisible}">${schoolCalendarVisible ? 'Ocultar calendario lectivo' : 'Cargar calendario lectivo de Madrid'}</button>${schoolCalendarVisible ? '<p>Vista temporal: los días no lectivos aparecen con un marco rayado y no se guardan en tu calendario.</p>' : ''}</div><section class="calendar">${months.map((_,m) => monthMarkup(m)).join('')}</section><section class="legend" aria-label="Leyenda">${data.dayTypes.map(t => `<span><i class="lg" style="background:${t.color}"></i>${esc(t.name)}</span>`).join('')}<span><i class="lg holiday-national"></i>Festivo nacional</span><span><i class="lg holiday-regional"></i>Comunidad de Madrid</span><span><i class="lg holiday-local"></i>Ciudad de Madrid</span><span><i class="lg holiday-recurring"></i>Festivo fijo</span><span><i class="lg weekend"></i>Fin de semana</span>${schoolCalendarVisible ? '<span><i class="lg school-non-teaching"></i>No lectivo (calendario escolar)</span>' : ''}</section></main>`);
  app.querySelector('#school-calendar')!.addEventListener('click', toggleSchoolCalendar);
  app.querySelectorAll<HTMLButtonElement>('.day').forEach(b => b.onclick = () => cycleDay(b.dataset.date!));
}
function toggleSchoolCalendar() {
  if (schoolCalendarVisible) { schoolCalendarVisible = false; schoolNonTeachingDays = []; return render(); }
  try { schoolNonTeachingDays = madridSchoolNonTeachingDays(year); schoolCalendarVisible = true; render(); }
  catch (error) { alert(error instanceof Error ? error.message : 'No se pudo cargar el calendario lectivo.'); }
}
async function cycleDay(date: string) {
  const code = nextDayTypeCode(data.dayTypes, data.days[date]?.code, date);
  if (code === TELEWORK_CODE && !canAddTeleworkDay(entriesOf(data), date)) {
    alert(`No puedes añadir más de ${TELEWORK_MONTHLY_LIMIT} días de teletrabajo en un mismo mes.`);
    return;
  }
  if (!code) {
    delete data.days[date];
    await repository.deleteDay(date);
  } else {
    const entry = { date, type: 'category', code } as CalendarEntry;
    const { date: _, ...day } = entry;
    data.days[date] = day;
    await repository.saveDay(entry);
  }
  render();
}
function renderSettings() {
  shell(`<main class="settings"><section><p class="eyebrow">CONFIGURACIÓN DE ${year}</p><h2>Tipos y saldos anuales</h2><p class="muted">Cada año tiene su propia lista de categorías, límites y colores. El orden determina la secuencia al marcar los días.</p><div class="list">${data.dayTypes.map((t,i) => `<div class="list-row"><i style="background:${t.color}"></i><div><strong>${esc(t.code)}</strong><small>${esc(t.name)} · Límite ${t.limit}${t.code === 'SI' ? ' · Disponible del 16 de mayo al 30 de junio' : ''}</small></div><span class="order-controls"><button data-move="up" data-index="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir ${esc(t.code)}">↑</button><button data-move="down" data-index="${i}" ${i === data.dayTypes.length - 1 ? 'disabled' : ''} aria-label="Bajar ${esc(t.code)}">↓</button></span><button data-edit="${i}">Editar</button><button class="danger" data-remove="${i}" aria-label="Eliminar">×</button></div>`).join('')}</div><button class="primary" id="add-code">+ Añadir categoría</button></section><section><p class="eyebrow">FESTIVOS</p><h2>Fechas no laborables</h2><p class="muted">El 24 y el 31 de diciembre son festivos fijos todos los años. Añade aquí el resto de festivos nacionales, autonómicos y de la ciudad.</p><div class="holiday-key"><span><i class="lg holiday-national"></i>España</span><span><i class="lg holiday-regional"></i>Comunidad</span><span><i class="lg holiday-local"></i>Madrid</span><span><i class="lg holiday-recurring"></i>Fijo</span></div><button class="primary import-holidays" id="import-holidays">Incorporar festivos de ${year}</button><div class="list">${data.holidays.sort((a,b) => a.date.localeCompare(b.date)).map((h,i) => `<div class="list-row holiday-item holiday-${h.scope}"><i></i><div><strong>${h.date.slice(5)}</strong><small>${esc(h.name)} · ${scopeName(h.scope)}</small></div><button class="danger" data-remove-holiday="${i}">×</button></div>`).join('') || '<p class="muted">Todavía no hay festivos adicionales.</p>'}</div><button class="secondary" id="add-holiday">+ Añadir festivo manualmente</button></section><section><p class="eyebrow">COPIA DE SEGURIDAD</p><h2>Importar y exportar</h2><p class="muted">El JSON contiene todo el año y sirve como copia portable fuera de Supabase.</p><div class="actions"><button class="secondary" id="export">Exportar JSON</button><label class="button secondary">Importar JSON<input id="import" type="file" accept="application/json"></label></div><p class="sync-note">Tus cambios se guardan en Supabase y están protegidos por tu cuenta.</p></section></main>`);
  app.querySelector('#add-code')!.addEventListener('click', () => editCode()); app.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach(b => b.onclick = () => editCode(Number(b.dataset.edit)));
  app.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(b => b.onclick = async () => { const from = Number(b.dataset.index); const to = b.dataset.move === 'up' ? from - 1 : from + 1; [data.dayTypes[from], data.dayTypes[to]] = [data.dayTypes[to]!, data.dayTypes[from]!]; await saveConfig(); renderSettings(); });
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
async function changeYear(next: number) { year = next; schoolCalendarVisible = false; schoolNonTeachingDays = []; data = await loadOrCreateYear(repository, year); render(); }

function renderMissingConfig() {
  app.innerHTML = `<main class="auth-page"><section class="auth-card"><p class="eyebrow">CONFIGURACIÓN NECESARIA</p><h1>Conecta Supabase</h1><p>Crea un archivo <code>.env.local</code> a partir de <code>.env.example</code>, añade la URL y la clave pública <strong>anon</strong> de tu proyecto y vuelve a iniciar la aplicación.</p><p class="muted">No uses nunca la clave <code>service_role</code> en esta web.</p></section></main>`;
}

function renderLogin(message = '') {
  app.innerHTML = `<main class="auth-page"><form class="auth-card"><p class="eyebrow">ACCESO PROTEGIDO</p><h1>Tu calendario</h1><p class="muted">Entra con tu correo y contraseña. Si todavía no tienes acceso, crea tu usuario aquí.</p>${message ? `<p class="auth-message">${esc(message)}</p>` : ''}<label>Correo electrónico<input name="email" type="email" autocomplete="email" required></label><label>Contraseña<input name="password" type="password" minlength="12" autocomplete="current-password" required></label><button class="primary" name="action" value="login">Entrar</button><button class="secondary auth-secondary" name="action" value="signup">Crear cuenta</button></form></main>`;
  app.querySelector<HTMLFormElement>('form')!.onsubmit = async event => {
    event.preventDefault();
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement;
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const credentials = { email: String(form.get('email')), password: String(form.get('password')) };
    const result = submitter.value === 'signup' ? await supabase!.auth.signUp(credentials) : await supabase!.auth.signInWithPassword(credentials);
    if (result.error) return renderLogin(result.error.message);
    if (!result.data.session) return renderLogin('Cuenta creada. Revisa tu correo para confirmarla antes de entrar.');
    await start();
  };
}

function renderFatal(error: unknown) {
  const message = error instanceof Error ? error.message : 'No se pudo conectar con Supabase.';
  app.innerHTML = `<main class="auth-page"><section class="auth-card"><p class="eyebrow">ERROR DE CONEXIÓN</p><h1>No pudimos cargar tus datos</h1><p class="auth-message">${esc(message)}</p><p class="muted">Comprueba que ejecutaste la migración SQL y que las variables de entorno son correctas.</p><button class="primary" id="retry">Reintentar</button></section></main>`;
  app.querySelector('#retry')!.addEventListener('click', start);
}
start();
