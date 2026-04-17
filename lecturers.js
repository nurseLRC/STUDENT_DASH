const CONFIG = {
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbzrXF0uWFMry_gZBTetDPyj-mKZtrEWU5Oq3Kz_ZlzcRApumP2tpLUOL9a7b7mIZV8cFQ/exec',
  TARGET_RATIO: 8
};

const state = {
  raw: null,
  scenario: {
    lecturers: 0,
    students: 0,
    plannedIntake: 0
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnRefresh')?.addEventListener('click', loadDashboard);
  document.getElementById('btnApplyScenario')?.addEventListener('click', applyScenarioFromInputs);
  document.getElementById('btnResetScenario')?.addEventListener('click', resetScenarioToRaw);

  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.stepTarget;
      const step = Number(btn.dataset.step || 0);
      stepInput(target, step);
      applyScenarioFromInputs();
    });
  });

  ['inputLecturers', 'inputStudents', 'inputPlannedIntake'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', applyScenarioFromInputs);
  });

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
    state.scenario.lecturers = Number(data.kpis.totalActiveLecturers || 0);
    state.scenario.students = Number(data.kpis.totalCurrentStudents || 0);
    state.scenario.plannedIntake = Number(data.kpis.plannedNewIntake || 0);

    syncInputsWithScenario();
    renderAll();
    clearError();
  } catch (err) {
    console.error(err);
    showError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
  } finally {
    showLoading(false);
  }
}

function applyScenarioFromInputs() {
  state.scenario.lecturers = clampNonNegative(readNumber('inputLecturers'));
  state.scenario.students = clampNonNegative(readNumber('inputStudents'));
  state.scenario.plannedIntake = clampNonNegative(readNumber('inputPlannedIntake'));
  renderAll();
}

function resetScenarioToRaw() {
  if (!state.raw) return;
  state.scenario.lecturers = Number(state.raw.kpis.totalActiveLecturers || 0);
  state.scenario.students = Number(state.raw.kpis.totalCurrentStudents || 0);
  state.scenario.plannedIntake = Number(state.raw.kpis.plannedNewIntake || 0);
  syncInputsWithScenario();
  renderAll();
}

function syncInputsWithScenario() {
  setInputValue('inputLecturers', state.scenario.lecturers);
  setInputValue('inputStudents', state.scenario.students);
  setInputValue('inputPlannedIntake', state.scenario.plannedIntake);
}

function renderAll() {
  if (!state.raw) return;

  const kpis = calculateScenarioKpis(
    state.scenario.lecturers,
    state.scenario.students,
    state.scenario.plannedIntake
  );

  renderKpis(kpis);
  renderGauge(kpis);
}

function calculateScenarioKpis(lecturers, students, plannedIntake) {
  const ratioValue = lecturers > 0 ? students / lecturers : 0;
  const ratioDisplay = lecturers > 0 ? `1 : ${ratioValue.toFixed(2)}` : 'ไม่มีอาจารย์';
  const intakeCapacityWithoutHiring = Math.max(0, (lecturers * CONFIG.TARGET_RATIO) - students);
  const additionalLecturersRequired = Math.max(
    0,
    Math.ceil((students + plannedIntake) / CONFIG.TARGET_RATIO) - lecturers
  );

  return {
    totalActiveLecturers: lecturers,
    totalCurrentStudents: students,
    currentRatioValue: Number(ratioValue.toFixed(2)),
    currentRatioDisplay: ratioDisplay,
    intakeCapacityWithoutHiring,
    plannedNewIntake: plannedIntake,
    additionalLecturersRequired
  };
}

function renderKpis(kpis) {
  setText('kpiLecturers', formatNumber(kpis.totalActiveLecturers));
  setText('kpiRatio', kpis.currentRatioDisplay);
  setText('kpiCapacity', `${formatNumber(kpis.intakeCapacityWithoutHiring)} คน`);
  setText('kpiNeedLecturers', `${formatNumber(kpis.additionalLecturersRequired)} คน`);
}

function renderGauge(kpis) {
  setText('gaugeRatioText', kpis.currentRatioDisplay);

  const status = kpis.currentRatioValue <= CONFIG.TARGET_RATIO
    ? 'อยู่ในเกณฑ์มาตรฐาน'
    : 'เกินเกณฑ์มาตรฐาน';

  setText('gaugeStatusText', `เกณฑ์เป้าหมายไม่เกิน 1 : 8 • สถานะ: ${status}`);
}

function stepInput(target, step) {
  const map = {
    lecturers: 'inputLecturers',
    students: 'inputStudents',
    plannedIntake: 'inputPlannedIntake'
  };

  const id = map[target];
  const el = document.getElementById(id);
  if (!el) return;

  const current = clampNonNegative(Number(el.value || 0));
  el.value = Math.max(0, current + step);
}

function readNumber(id) {
  return Number(document.getElementById(id)?.value || 0);
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function clampNonNegative(value) {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('th-TH');
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