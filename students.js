const CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbzrXF0uWFMry_gZBTetDPyj-mKZtrEWU5Oq3Kz_ZlzcRApumP2tpLUOL9a7b7mIZV8cFQ/exec',
  CURRENT_FIRST_YEAR_COHORT: 68
};

const state = {
  raw: null
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnRefresh')?.addEventListener('click', loadDashboard);
  loadDashboard();
});

async function loadDashboard() {
  showLoading(true);

  try {
    const url = `${CONFIG.API_BASE_URL}?action=dashboard&_ts=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'โหลดข้อมูลไม่สำเร็จ');

    state.raw = data;
    renderAll();
    clearError();
  } catch (err) {
    console.error(err);
    showError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
  } finally {
    showLoading(false);
  }
}

function renderAll() {
  if (!state.raw) return;

  setText('kpiStudents', formatNumber(state.raw.kpis.totalCurrentStudents || 0));
  renderStudentsByCohort(state.raw.charts.studentsByCohort || []);
  renderRetentionChart(state.raw.charts.retentionByCohort || []);
}

function renderStudentsByCohort(items) {
  const el = document.getElementById('cohortChart');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<div class="empty-state">ไม่พบข้อมูล</div>`;
    return;
  }

  const sortedItems = [...items].sort((a, b) => {
    const yearA = Number(getStudyYearNumber(a.cohort));
    const yearB = Number(getStudyYearNumber(b.cohort));
    return yearA - yearB;
  });

  const max = Math.max(...sortedItems.map(x => x.currentCount || 0), 1);

  el.innerHTML = sortedItems.map(item => {
    const height = Math.max(12, (Number(item.currentCount || 0) / max) * 100);

    return `
      <div class="vertical-bar-item">
        <div class="vertical-bar-value">${formatNumber(item.currentCount)} คน</div>
        <div class="vertical-bar-wrap">
          <div class="vertical-bar" style="height:${height}%"></div>
        </div>
        <div class="vertical-bar-label">${escapeHtml(getStudyYearLabel(item.cohort))}</div>
      </div>
    `;
  }).join('');
}
function getStudyYearNumber(cohortValue) {
  const cohort = Number(cohortValue);
  if (!Number.isFinite(cohort)) return 999;

  const studyYear = CONFIG.CURRENT_FIRST_YEAR_COHORT - cohort + 1;
  return studyYear;
}
function renderRetentionChart(items) {
  const el = document.getElementById('retentionChart');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<div class="empty-state">ไม่พบข้อมูล</div>`;
    return;
  }

  el.innerHTML = items.map(item => `
    <div class="retention-row">
      <div class="retention-head">
        <div class="retention-title">${escapeHtml(getStudyYearLabel(item.cohort))}</div>
        <div class="retention-value">${Number(item.retentionRate || 0).toFixed(2)}%</div>
      </div>
      <div class="retention-track">
        <div class="retention-fill" style="width:${Math.max(0, Math.min(100, Number(item.retentionRate || 0)))}%"></div>
      </div>
      <div class="retention-meta">
        เดิม ${formatNumber(item.originalCount)} คน • ปัจจุบัน ${formatNumber(item.currentCount)} คน
      </div>
    </div>
  `).join('');
}

function getStudyYearLabel(cohortValue) {
  const cohort = Number(cohortValue);
  if (!Number.isFinite(cohort)) return `รุ่น ${cohortValue}`;

  const studyYear = CONFIG.CURRENT_FIRST_YEAR_COHORT - cohort + 1;
  if (studyYear >= 1 && studyYear <= 10) return `ชั้นปีที่ ${studyYear}`;
  return `รุ่น ${cohortValue}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('th-TH');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showLoading(isLoading) {
  const el = document.getElementById('loadingState');
  if (!el) return;
  el.style.display = isLoading ? 'flex' : 'none';
}

function showError(message) {
  const el = document.getElementById('errorState');
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function clearError() {
  const el = document.getElementById('errorState');
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}