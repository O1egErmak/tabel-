'use strict';

/* ===================== Firebase Init ===================== */

const firebaseConfig = {
  apiKey: "AIzaSyAe7BhoNaluYMKQgW_SMb2_tNVKadkgVJI",
  authDomain: "tabel-f40c3.firebaseapp.com",
  projectId: "tabel-f40c3",
  storageBucket: "tabel-f40c3.firebasestorage.app",
  messagingSenderId: "90528693206",
  appId: "1:90528693206:web:2579f4a2e787b5f0344277",
  measurementId: "G-FP9768H7GE"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

/* ===================== Constants ===================== */

const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];
const DAY_NAMES = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

/* ===================== State ===================== */

let currentUser = null;
let saveTimeout = null;
let unsubscribeFirestore = null;

let state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  rows: [],
  rate: 0, bonus: 0, extra: 0, penalty: 0
};

/* ===================== DOM ===================== */

const els = {
  loginScreen: document.getElementById('loginScreen'),
  mainApp: document.getElementById('mainApp'),
  googleSignInBtn: document.getElementById('googleSignInBtn'),
  signOutBtn: document.getElementById('signOutBtn'),
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
  monthSelect: document.getElementById('monthSelect'),
  yearInput: document.getElementById('yearInput'),
  prevMonth: document.getElementById('prevMonth'),
  nextMonth: document.getElementById('nextMonth'),
  tableBody: document.getElementById('tableBody'),
  emptyState: document.getElementById('emptyState'),
  loadingState: document.getElementById('loadingState'),
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

/* ===================== Auth ===================== */

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    els.userAvatar.src = user.photoURL || '';
    els.userName.textContent = user.displayName ? user.displayName.split(' ')[0] : user.email;
    els.loginScreen.hidden = true;
    els.mainApp.hidden = false;
    buildMonthSelect();
    loadPeriodPreference();
    subscribeToMonth();
  } else {
    currentUser = null;
    if (unsubscribeFirestore) { unsubscribeFirestore(); unsubscribeFirestore = null; }
    els.loginScreen.hidden = false;
    els.mainApp.hidden = true;
  }
});

els.googleSignInBtn.addEventListener('click', () => {
  auth.signInWithPopup(googleProvider).catch(err => {
    showToast('Ошибка входа: ' + err.message);
  });
});

els.signOutBtn.addEventListener('click', () => {
  if (unsubscribeFirestore) { unsubscribeFirestore(); unsubscribeFirestore = null; }
  auth.signOut();
});

/* ===================== Firestore helpers ===================== */

function docRef() {
  const key = `${state.year}_${pad(state.month + 1)}`;
  return db.collection('users').doc(currentUser.uid).collection('months').doc(key);
}

function subscribeToMonth() {
  if (unsubscribeFirestore) { unsubscribeFirestore(); unsubscribeFirestore = null; }
  els.loadingState.hidden = false;
  els.emptyState.hidden = true;
  els.tableBody.innerHTML = '';

  unsubscribeFirestore = docRef().onSnapshot(snap => {
    els.loadingState.hidden = true;
    if (snap.exists) {
      const data = snap.data();
      state.rows   = Array.isArray(data.rows) ? data.rows : [];
      state.rate    = Number(data.rate)    || 0;
      state.bonus   = Number(data.bonus)   || 0;
      state.extra   = Number(data.extra)   || 0;
      state.penalty = Number(data.penalty) || 0;
    } else {
      state.rows = [];
      state.rate = state.bonus = state.extra = state.penalty = 0;
    }
    els.rateInput.value    = state.rate    || '';
    els.bonusInput.value   = state.bonus   || '';
    els.extraInput.value   = state.extra   || '';
    els.penaltyInput.value = state.penalty || '';
    render();
  }, err => {
    els.loadingState.hidden = true;
    showToast('Ошибка загрузки: ' + err.message);
  });
}

function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveToFirestore, 800);
}

function saveToFirestore() {
  if (!currentUser) return;
  docRef().set({
    rows: state.rows,
    rate: state.rate,
    bonus: state.bonus,
    extra: state.extra,
    penalty: state.penalty,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => showToast('Ошибка сохранения: ' + err.message));
  savePeriodPreference();
}

/* ===================== Period preference (localStorage) ===================== */

function savePeriodPreference() {
  localStorage.setItem('tt_period', JSON.stringify({ year: state.year, month: state.month }));
}

function loadPeriodPreference() {
  try {
    const raw = localStorage.getItem('tt_period');
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.year === 'number')  state.year  = p.year;
      if (typeof p.month === 'number') state.month = p.month;
    }
  } catch(e) {}
  els.monthSelect.value = state.month;
  els.yearInput.value   = state.year;
}

/* ===================== Helpers ===================== */

function uid()  { return 'r' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function pad(n) { return String(n).padStart(2,'0'); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function isoFromYMD(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}`; }

function dayOfWeekName(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? '' : DAY_NAMES[d.getDay()];
}

function isWeekend(iso) {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return false;
  return d.getDay() === 0 || d.getDay() === 6;
}

function timeToMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return isNaN(h) || isNaN(m) ? null : h*60+m;
}

function calcHours(row) {
  const s = timeToMin(row.start), e = timeToMin(row.end);
  if (s === null || e === null) return 0;
  let diff = e - s;
  if (diff <= 0) diff += 24*60;
  diff -= (Number(row.breakMin) || 0);
  return Math.max(diff, 0) / 60;
}

function fmtH(h) { return h.toFixed(2).replace(/\.00$/,'.0').replace(/(\.\d)0$/,'$1'); }

function fmtMoney(n) {
  return (Math.round(n*100)/100).toLocaleString('ru-RU', {maximumFractionDigits:2}) + ' ₸';
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  requestAnimationFrame(() => els.toast.classList.add('show'));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.classList.remove('show');
    setTimeout(() => { els.toast.hidden = true; }, 250);
  }, 2200);
}

function sortedRows() {
  return [...state.rows].sort((a,b) => (a.date||'').localeCompare(b.date||''));
}

/* ===================== Render ===================== */

function render() { renderTable(); renderStats(); }

function renderTable() {
  const rows = sortedRows();
  els.tableBody.innerHTML = '';
  els.emptyState.hidden = rows.length > 0;

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;
    if (isWeekend(row.date)) tr.classList.add('weekend');
    const hours = calcHours(row);
    tr.innerHTML = `
      <td class="col-date"><input type="date" class="f-date" value="${row.date||''}"></td>
      <td class="col-day">${dayOfWeekName(row.date)}</td>
      <td class="col-time"><input type="time" class="f-start" value="${row.start||''}"></td>
      <td class="col-time"><input type="time" class="f-end"   value="${row.end||''}"></td>
      <td class="col-break"><input type="number" class="f-break" min="0" step="5" value="${row.breakMin||0}"></td>
      <td class="col-hours"><span class="hours-badge">${fmtH(hours)}</span></td>
      <td class="col-comment"><input type="text" class="f-comment" placeholder="—" value="${escAttr(row.comment||'')}"></td>
      <td class="col-action"><button class="row-delete" title="Удалить">✕</button></td>
    `;
    els.tableBody.appendChild(tr);
  });
}

function escAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function renderStats() {
  const totalDays  = state.rows.filter(r => r.date).length;
  const totalHours = state.rows.reduce((s,r) => s + calcHours(r), 0);
  const avgHours   = totalDays > 0 ? totalHours / totalDays : 0;

  const rate    = Number(els.rateInput.value)    || 0;
  const bonus   = Number(els.bonusInput.value)   || 0;
  const extra   = Number(els.extraInput.value)   || 0;
  const penalty = Number(els.penaltyInput.value) || 0;
  const total   = totalHours * rate + bonus + extra - penalty;

  els.statDays.textContent  = totalDays;
  els.statHours.textContent = fmtH(totalHours);
  els.statAvg.textContent   = fmtH(avgHours);
  els.statTotal.textContent = fmtMoney(total);

  els.formulaText.textContent =
    `(${fmtH(totalHours)} ч × ${rate}) + ${bonus} + ${extra} − ${penalty} = `;
  els.formulaResult.textContent = fmtMoney(total);
}

/* ===================== Events ===================== */

function bindEvents() {
  els.monthSelect.addEventListener('change', onPeriodChange);
  els.yearInput.addEventListener('change', onPeriodChange);
  els.prevMonth.addEventListener('click', () => shiftMonth(-1));
  els.nextMonth.addEventListener('click', () => shiftMonth(1));
  els.addRowBtn.addEventListener('click', addRow);
  els.clearMonthBtn.addEventListener('click', clearMonth);
  els.tableBody.addEventListener('input', onTableInput);
  els.tableBody.addEventListener('click', onTableClick);
  [els.rateInput, els.bonusInput, els.extraInput, els.penaltyInput]
    .forEach(inp => inp.addEventListener('input', onPayrollInput));
  els.exportXlsxBtn.addEventListener('click', exportXlsx);
  els.exportCsvBtn.addEventListener('click', exportCsv);
  els.printBtn.addEventListener('click', () => window.print());
}

function buildMonthSelect() {
  els.monthSelect.innerHTML = MONTH_NAMES
    .map((n,i) => `<option value="${i}">${n}</option>`).join('');
}

function onPeriodChange() {
  state.month = Number(els.monthSelect.value);
  state.year  = Number(els.yearInput.value) || state.year;
  subscribeToMonth();
}

function shiftMonth(delta) {
  let m = state.month + delta, y = state.year;
  if (m < 0)  { m = 11; y--; }
  if (m > 11) { m = 0;  y++; }
  state.month = m; state.year = y;
  els.monthSelect.value = m;
  els.yearInput.value   = y;
  subscribeToMonth();
}

function addRow() {
  const rows = sortedRows();
  let nextDate;
  if (rows.length > 0) {
    const last = new Date(rows[rows.length-1].date + 'T00:00:00');
    if (!isNaN(last)) {
      last.setDate(last.getDate()+1);
      if (last.getFullYear() === state.year && last.getMonth() === state.month) {
        nextDate = isoFromYMD(state.year, state.month, last.getDate());
      }
    }
  }
  if (!nextDate) {
    const t = new Date();
    nextDate = (t.getFullYear() === state.year && t.getMonth() === state.month)
      ? todayISO()
      : isoFromYMD(state.year, state.month, 1);
  }
  state.rows.push({ id: uid(), date: nextDate, start:'09:00', end:'18:00', breakMin:60, comment:'' });
  render();
  scheduleSave();
  showToast('Строка добавлена');
}

function clearMonth() {
  if (state.rows.length === 0) { showToast('Месяц уже пуст'); return; }
  if (!confirm(`Удалить все записи за ${MONTH_NAMES[state.month]} ${state.year}?`)) return;
  state.rows = [];
  render();
  scheduleSave();
  showToast('Месяц очищен');
}

function onTableInput(e) {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const row = state.rows.find(r => r.id === tr.dataset.id);
  if (!row) return;

  if (e.target.classList.contains('f-date'))    row.date     = e.target.value;
  if (e.target.classList.contains('f-start'))   row.start    = e.target.value;
  if (e.target.classList.contains('f-end'))     row.end      = e.target.value;
  if (e.target.classList.contains('f-break'))   row.breakMin = Number(e.target.value)||0;
  if (e.target.classList.contains('f-comment')) row.comment  = e.target.value;

  if (e.target.classList.contains('f-date')) {
    render();
  } else {
    const badge = tr.querySelector('.hours-badge');
    if (badge) badge.textContent = fmtH(calcHours(row));
    renderStats();
  }
  scheduleSave();
}

function onTableClick(e) {
  const btn = e.target.closest('.row-delete');
  if (!btn) return;
  const tr = btn.closest('tr');
  state.rows = state.rows.filter(r => r.id !== tr.dataset.id);
  render();
  scheduleSave();
  showToast('Строка удалена');
}

function onPayrollInput() {
  state.rate    = Number(els.rateInput.value)    || 0;
  state.bonus   = Number(els.bonusInput.value)   || 0;
  state.extra   = Number(els.extraInput.value)   || 0;
  state.penalty = Number(els.penaltyInput.value) || 0;
  renderStats();
  scheduleSave();
}

/* ===================== Export ===================== */

function buildExportData() {
  const header = ['Дата','День недели','Начало','Окончание','Перерыв (мин)','Отработано часов','Комментарий'];
  const rows = sortedRows().map(r => [
    r.date||'', dayOfWeekName(r.date), r.start||'', r.end||'',
    r.breakMin||0, Number(fmtH(calcHours(r))), r.comment||''
  ]);
  return [header, ...rows];
}

function exportXlsx() {
  if (typeof XLSX === 'undefined') { showToast('Библиотека не загружена'); return; }
  if (!state.rows.length) { showToast('Нет данных для экспорта'); return; }

  const data = buildExportData();
  const totalHours = state.rows.reduce((s,r) => s+calcHours(r), 0);
  const rate=Number(els.rateInput.value)||0, bonus=Number(els.bonusInput.value)||0,
        extra=Number(els.extraInput.value)||0, penalty=Number(els.penaltyInput.value)||0;
  const total = totalHours*rate + bonus + extra - penalty;

  data.push([],[
    'Всего дней', state.rows.filter(r=>r.date).length
  ],['Всего часов', Number(fmtH(totalHours))],['Ставка', rate],
  ['Премия', bonus],['Доп. выплаты', extra],['Штрафы', penalty],
  ['Итого', Number(total.toFixed(2))]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:12},{wch:12},{wch:9},{wch:11},{wch:14},{wch:16},{wch:28}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${MONTH_NAMES[state.month]} ${state.year}`.slice(0,31));
  XLSX.writeFile(wb, `tabel_${state.year}_${pad(state.month+1)}.xlsx`);
  showToast('Excel сохранён');
}

function exportCsv() {
  if (!state.rows.length) { showToast('Нет данных для экспорта'); return; }
  const csv = buildExportData().map(row =>
    row.map(c => { const s=String(c??''); return (s.includes(',')||s.includes('"'))?`"${s.replace(/"/g,'""')}"`:s; }).join(',')
  ).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'}));
  a.download = `tabel_${state.year}_${pad(state.month+1)}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast('CSV сохранён');
}

/* ===================== Start ===================== */

document.addEventListener('DOMContentLoaded', bindEvents);
