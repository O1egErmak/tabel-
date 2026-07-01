'use strict';

/* ===================== Constants ===================== */

const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];

const DAY_NAMES = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

const STORAGE_PREFIX = 'timetracker_';
const SETTINGS_KEY = 'timetracker_settings';

/* Seed data: prefilled June 2026 schedule, used only if no saved data exists yet for that month */
const SEED_YEAR = 2026;
const SEED_MONTH = 5; // June (0-indexed)
const SEED_RATE = 67;
const SEED_ENTRIES = [
  ['2026-06-01','08:00','17:00',0],
  ['2026-06-02','08:00','17:00',0],
  ['2026-06-03','08:00','17:00',0],
  ['2026-06-04','08:00','17:00',0],
  ['2026-06-05','08:00','17:00',0],
  ['2026-06-06','08:00','17:00',30],
  ['2026-06-08','08:00','17:00',0],
  ['2026-06-09','08:00','17:00',0],
  ['2026-06-10','08:00','17:00',0],
  ['2026-06-11','08:00','17:00',0],
  ['2026-06-12','08:00','17:00',0],
  ['2026-06-13','08:00','13:00',0],
  ['2026-06-15','08:00','17:00',0],
  ['2026-06-16','08:00','17:00',0],
  ['2026-06-17','08:00','17:00',0],
  ['2026-06-18','08:00','17:00',0],
  ['2026-06-19','08:00','17:00',0],
  ['2026-06-22','08:00','17:00',0],
  ['2026-06-23','08:00','17:00',0],
  ['2026-06-24','08:00','17:00',0],
  ['2026-06-25','08:00','17:00',0],
  ['2026-06-26','08:00','17:00',0],
  ['2026-06-27','08:00','12:00',0],
  ['2026-06-29','08:00','17:00',0],
  ['2026-06-30','08:00','17:00',0]
];

/* ===================== State ===================== */

let state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(), // 0-11
  rows: [],        // {id, date, start, end, breakMin, comment}
  rate: 0,
  bonus: 0,
  extra: 0,
  penalty: 0
};

/* ===================== DOM refs ===================== */

const els = {
  monthSelect: document.getElementById('monthSelect'),
  yearInput: document.getElementById('yearInput'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  tableBody: document.getElementById('tableBody'),
  emptyState: document.getElementById('emptyState'),
  addRowBtn: document.getElementById('addRowBtn'),
  clearMonthBtn: document.getElementById('clearMonthBtn'),
  statDays: document.getElementById('statDays'),
  statHours: document.getElementById('statHours'),
  statAvg: document.getElementById('statAvg'),
  statTotal: document.getElementById('statTotal'),
  rateInput: document.getElementById('rateInput'),
  bonusInput: document.getElementById('bonusInput'),
  extraInput: document.getElementById('extraInput'),
  penaltyInput: document.getElementById('penaltyInput'),
  formulaText: document.getElementById('formulaText'),
  formulaResult: document.getElementById('formulaResult'),
  exportXlsxBtn: document.getElementById('exportXlsxBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  printBtn: document.getElementById('printBtn'),
  toast: document.getElementById('toast')
};

/* ===================== Init ===================== */

function init(){
  buildMonthSelect();
  loadSettingsLastPeriod();
  els.monthSelect.value = state.month;
  els.yearInput.value = state.year;

  loadMonthData();
  bindEvents();
  render();
}

function buildMonthSelect(){
  els.monthSelect.innerHTML = MONTH_NAMES
    .map((name, i) => `<option value="${i}">${name}</option>`)
    .join('');
}

function loadSettingsLastPeriod(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if(raw){
      const s = JSON.parse(raw);
      if(typeof s.year === 'number') state.year = s.year;
      if(typeof s.month === 'number') state.month = s.month;
    }
  }catch(e){ /* ignore */ }
}

function saveSettingsLastPeriod(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({year: state.year, month: state.month}));
}

/* ===================== Storage per month ===================== */

function periodKey(year, month){
  return `${STORAGE_PREFIX}${year}_${String(month+1).padStart(2,'0')}`;
}

function loadMonthData(){
  const key = periodKey(state.year, state.month);
  try{
    const raw = localStorage.getItem(key);
    if(raw){
      const data = JSON.parse(raw);
      state.rows = Array.isArray(data.rows) ? data.rows : [];
      state.rate = Number(data.rate) || 0;
      state.bonus = Number(data.bonus) || 0;
      state.extra = Number(data.extra) || 0;
      state.penalty = Number(data.penalty) || 0;
    }else if(state.year === SEED_YEAR && state.month === SEED_MONTH){
      state.rows = SEED_ENTRIES.map(([date, start, end, breakMin]) => ({
        id: uid(),
        date, start, end, breakMin,
        comment: ''
      }));
      state.rate = SEED_RATE;
      state.bonus = 0;
      state.extra = 0;
      state.penalty = 0;
    }else{
      state.rows = [];
      state.rate = 0;
      state.bonus = 0;
      state.extra = 0;
      state.penalty = 0;
    }
  }catch(e){
    state.rows = [];
  }

  els.rateInput.value = state.rate || '';
  els.bonusInput.value = state.bonus || '';
  els.extraInput.value = state.extra || '';
  els.penaltyInput.value = state.penalty || '';
}

function saveMonthData(){
  const key = periodKey(state.year, state.month);
  const payload = {
    rows: state.rows,
    rate: state.rate,
    bonus: state.bonus,
    extra: state.extra,
    penalty: state.penalty
  };
  localStorage.setItem(key, JSON.stringify(payload));
  saveSettingsLastPeriod();
}

/* ===================== Helpers ===================== */

function uid(){
  return 'r' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function pad(n){ return String(n).padStart(2,'0'); }

function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function isoFromYM(year, month, day){
  return `${year}-${pad(month+1)}-${pad(day)}`;
}

function dayOfWeekName(isoDate){
  if(!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if(isNaN(d.getTime())) return '';
  return DAY_NAMES[d.getDay()];
}

function isWeekend(isoDate){
  if(!isoDate) return false;
  const d = new Date(isoDate + 'T00:00:00');
  if(isNaN(d.getTime())) return false;
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}

function timeToMinutes(t){
  if(!t) return null;
  const [h,m] = t.split(':').map(Number);
  if(Number.isNaN(h) || Number.isNaN(m)) return null;
  return h*60+m;
}

/**
 * Calculates worked hours for a row.
 * If end < start, assumes the shift ended next day (overnight shift).
 */
function calcHours(row){
  const startMin = timeToMinutes(row.start);
  const endMin = timeToMinutes(row.end);
  if(startMin === null || endMin === null) return 0;

  let diff = endMin - startMin;
  if(diff <= 0){
    diff += 24*60; // overnight shift
  }

  const brk = Number(row.breakMin) || 0;
  diff -= brk;
  if(diff < 0) diff = 0;

  return diff / 60;
}

function formatHours(h){
  return h.toFixed(2).replace(/\.00$/, '.0').replace(/(\.\d)0$/, '$1');
}

function formatMoney(n){
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('ru-RU', {maximumFractionDigits: 2}) + ' ₸';
}

function showToast(msg){
  els.toast.textContent = msg;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => { els.toast.hidden = true; }, 250);
  }, 2200);
}

/* ===================== Rendering ===================== */

function sortedRows(){
  return [...state.rows].sort((a,b) => (a.date || '').localeCompare(b.date || ''));
}

function render(){
  renderTable();
  renderStats();
}

function renderTable(){
  const rows = sortedRows();
  els.tableBody.innerHTML = '';
  els.emptyState.hidden = rows.length > 0;

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    if(isWeekend(row.date)) tr.classList.add('weekend');

    const hours = calcHours(row);

    tr.innerHTML = `
      <td class="col-date"><input type="date" class="f-date" value="${row.date || ''}"></td>
      <td class="col-day">${dayOfWeekName(row.date)}</td>
      <td class="col-time"><input type="time" class="f-start" value="${row.start || ''}"></td>
      <td class="col-time"><input type="time" class="f-end" value="${row.end || ''}"></td>
      <td class="col-break"><input type="number" class="f-break" min="0" step="5" value="${row.breakMin || 0}"></td>
      <td class="col-hours"><span class="hours-badge">${formatHours(hours)}</span></td>
      <td class="col-comment"><input type="text" class="f-comment" placeholder="—" value="${escapeAttr(row.comment || '')}"></td>
      <td class="col-action"><button class="row-delete" title="Удалить" aria-label="Удалить строку">✕</button></td>
    `;

    els.tableBody.appendChild(tr);
  });
}

function escapeAttr(str){
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function renderStats(){
  const rows = state.rows;
  const totalDays = rows.filter(r => r.date).length;
  const totalHours = rows.reduce((sum, r) => sum + calcHours(r), 0);
  const avgHours = totalDays > 0 ? totalHours / totalDays : 0;

  const rate = Number(els.rateInput.value) || 0;
  const bonus = Number(els.bonusInput.value) || 0;
  const extra = Number(els.extraInput.value) || 0;
  const penalty = Number(els.penaltyInput.value) || 0;

  const total = (totalHours * rate) + bonus + extra - penalty;

  els.statDays.textContent = totalDays;
  els.statHours.textContent = formatHours(totalHours);
  els.statAvg.textContent = formatHours(avgHours);
  els.statTotal.textContent = formatMoney(total);

  els.formulaText.textContent =
    `(${formatHours(totalHours)} ч × ${rate || 0}) + ${bonus || 0} + ${extra || 0} − ${penalty || 0} = `;
  els.formulaResult.textContent = formatMoney(total);
}

/* ===================== Events ===================== */

function bindEvents(){
  els.monthSelect.addEventListener('change', onPeriodChange);
  els.yearInput.addEventListener('change', onPeriodChange);
  els.prevMonth.addEventListener('click', () => shiftMonth(-1));
  els.nextMonth.addEventListener('click', () => shiftMonth(1));

  els.addRowBtn.addEventListener('click', addRow);
  els.clearMonthBtn.addEventListener('click', clearMonth);

  els.tableBody.addEventListener('input', onTableInput);
  els.tableBody.addEventListener('click', onTableClick);

  [els.rateInput, els.bonusInput, els.extraInput, els.penaltyInput].forEach(input => {
    input.addEventListener('input', onPayrollInput);
  });

  els.exportXlsxBtn.addEventListener('click', exportXlsx);
  els.exportCsvBtn.addEventListener('click', exportCsv);
  els.printBtn.addEventListener('click', () => window.print());
}

function onPeriodChange(){
  state.month = Number(els.monthSelect.value);
  state.year = Number(els.yearInput.value) || state.year;
  loadMonthData();
  render();
}

function shiftMonth(delta){
  let m = state.month + delta;
  let y = state.year;
  if(m < 0){ m = 11; y--; }
  if(m > 11){ m = 0; y++; }
  state.month = m;
  state.year = y;
  els.monthSelect.value = m;
  els.yearInput.value = y;
  loadMonthData();
  render();
}

function addRow(){
  const rows = sortedRows();
  let nextDate;

  if(rows.length > 0){
    const last = new Date(rows[rows.length - 1].date + 'T00:00:00');
    if(!isNaN(last.getTime())){
      last.setDate(last.getDate() + 1);
      if(last.getFullYear() === state.year && last.getMonth() === state.month){
        nextDate = isoFromYM(state.year, state.month, last.getDate());
      }
    }
  }

  if(!nextDate){
    const today = new Date();
    if(today.getFullYear() === state.year && today.getMonth() === state.month){
      nextDate = todayISO();
    }else{
      nextDate = isoFromYM(state.year, state.month, 1);
    }
  }

  state.rows.push({
    id: uid(),
    date: nextDate,
    start: '09:00',
    end: '18:00',
    breakMin: 60,
    comment: ''
  });

  saveMonthData();
  render();
  showToast('Строка добавлена');
}

function clearMonth(){
  if(state.rows.length === 0){
    showToast('Месяц уже пуст');
    return;
  }
  const ok = confirm(`Удалить все записи за ${MONTH_NAMES[state.month]} ${state.year}? Это действие необратимо.`);
  if(!ok) return;
  state.rows = [];
  saveMonthData();
  render();
  showToast('Месяц очищен');
}

function onTableInput(e){
  const tr = e.target.closest('tr');
  if(!tr) return;
  const id = tr.dataset.id;
  const row = state.rows.find(r => r.id === id);
  if(!row) return;

  if(e.target.classList.contains('f-date')) row.date = e.target.value;
  if(e.target.classList.contains('f-start')) row.start = e.target.value;
  if(e.target.classList.contains('f-end')) row.end = e.target.value;
  if(e.target.classList.contains('f-break')) row.breakMin = Number(e.target.value) || 0;
  if(e.target.classList.contains('f-comment')) row.comment = e.target.value;

  saveMonthData();

  // Only re-render fully if date changed (affects day-of-week / sort / weekend),
  // otherwise just update hours + stats for snappier typing.
  if(e.target.classList.contains('f-date')){
    render();
  }else{
    const hours = calcHours(row);
    const badge = tr.querySelector('.hours-badge');
    if(badge) badge.textContent = formatHours(hours);
    renderStats();
  }
}

function onTableClick(e){
  const delBtn = e.target.closest('.row-delete');
  if(!delBtn) return;
  const tr = delBtn.closest('tr');
  const id = tr.dataset.id;
  state.rows = state.rows.filter(r => r.id !== id);
  saveMonthData();
  render();
  showToast('Строка удалена');
}

function onPayrollInput(){
  state.rate = Number(els.rateInput.value) || 0;
  state.bonus = Number(els.bonusInput.value) || 0;
  state.extra = Number(els.extraInput.value) || 0;
  state.penalty = Number(els.penaltyInput.value) || 0;
  saveMonthData();
  renderStats();
}

/* ===================== Export ===================== */

function buildExportRows(){
  const header = ['Дата','День недели','Начало','Окончание','Перерыв (мин)','Отработано часов','Комментарий'];
  const rows = sortedRows().map(r => [
    r.date || '',
    dayOfWeekName(r.date),
    r.start || '',
    r.end || '',
    r.breakMin || 0,
    Number(formatHours(calcHours(r))),
    r.comment || ''
  ]);
  return [header, ...rows];
}

function exportXlsx(){
  if(typeof XLSX === 'undefined'){
    showToast('Библиотека экспорта не загрузилась');
    return;
  }
  if(state.rows.length === 0){
    showToast('Нет данных для экспорта');
    return;
  }

  const data = buildExportRows();

  // Append summary block
  const totalHours = state.rows.reduce((s,r) => s + calcHours(r), 0);
  const rate = Number(els.rateInput.value) || 0;
  const bonus = Number(els.bonusInput.value) || 0;
  const extra = Number(els.extraInput.value) || 0;
  const penalty = Number(els.penaltyInput.value) || 0;
  const total = (totalHours * rate) + bonus + extra - penalty;

  data.push([]);
  data.push(['Всего рабочих дней', state.rows.filter(r=>r.date).length]);
  data.push(['Всего часов', Number(formatHours(totalHours))]);
  data.push(['Ставка в час', rate]);
  data.push(['Премия', bonus]);
  data.push(['Доп. выплаты', extra]);
  data.push(['Штрафы/вычеты', penalty]);
  data.push(['Итого к выплате', Number(total.toFixed(2))]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:12},{wch:12},{wch:9},{wch:11},{wch:14},{wch:16},{wch:28}];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${MONTH_NAMES[state.month]} ${state.year}`.slice(0,31));

  XLSX.writeFile(wb, `tabel_${state.year}_${pad(state.month+1)}.xlsx`);
  showToast('Файл Excel сохранён');
}

function exportCsv(){
  if(state.rows.length === 0){
    showToast('Нет данных для экспорта');
    return;
  }
  const data = buildExportRows();
  const csv = data.map(row =>
    row.map(cell => {
      const str = String(cell ?? '');
      if(str.includes(',') || str.includes('"') || str.includes('\n')){
        return '"' + str.replace(/"/g,'""') + '"';
      }
      return str;
    }).join(',')
  ).join('\n');

  const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tabel_${state.year}_${pad(state.month+1)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Файл CSV сохранён');
}

/* ===================== Start ===================== */

document.addEventListener('DOMContentLoaded', init);
