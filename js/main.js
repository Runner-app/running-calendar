import '../styles.less';
import { state, loadData, saveRuns, saveSettings } from "./state.js";
import { getMonday } from "./utils.js";
import { renderCalendar, updateStats } from "./calendar.js";
import {
  openRunModal,
  closeRunModal,
  openSettingsModal,
  closeSettingsModal,
  formRun,
  formSettings,
  modalRunOverlay,
  modalSettingsOverlay,
  inputDurationH,
  inputDurationM,
  inputDurationS,
  inputPaceM,
  inputPaceS,
  inputRunDistance,
  updatePaceFromDuration,
  updateDurationFromPace,
  lastEditedCalculatorGroup,
  setLastEditedGroup,
  manualRunNumContainer,
} from "./modals.js";
import { exportBackupToJSON, importBackupFromJSON } from "./backup.js";
import { renderStatsPage } from "./stats.js";

// Elementy Nawigacji Głównej
const btnPrevMonth = document.getElementById("btn-prev-month");
const btnNextMonth = document.getElementById("btn-next-month");
const btnPrevYear = document.getElementById("btn-prev-year");
const btnNextYear = document.getElementById("btn-next-year");
const btnToday = document.getElementById("btn-today");
const btnAddRunSidebar = document.getElementById("btn-add-run-sidebar");
const btnSettingsSidebar = document.getElementById("btn-settings-sidebar");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
const btnStatsSidebar = document.getElementById("btn-stats-sidebar");
const btnBackStats = document.getElementById("btn-back-stats");
const calendarPanel = document.querySelector(".calendar-panel");
const statsPage = document.getElementById("stats-page");

// Elementy Backup JSON
const btnExportJson = document.getElementById("btn-export-json");
const btnTriggerImport = document.getElementById("btn-trigger-import");
const inputImportJson = document.getElementById("input-import-json");

function showStatsPage() {
  calendarPanel.style.display = "none";
  statsPage.style.display = "flex";
  renderStatsPage();
}

function showCalendarPage() {
  calendarPanel.style.display = "block";
  statsPage.style.display = "none";
}

function init() {
  loadData();
  state.currentDate = getMonday(new Date()); // Bezpieczna inicjalizacja daty bazowej
  setupEventListeners();
  renderCalendar();
  updateStats();
}

function setupEventListeners() {
  // Nawigacja
  btnPrevMonth.addEventListener("click", () => {
    state.currentDate.setDate(state.currentDate.getDate() - 21);
    renderCalendar();
  });

  btnNextMonth.addEventListener("click", () => {
    state.currentDate.setDate(state.currentDate.getDate() + 21);
    renderCalendar();
  });

  if (btnNextYear) {
    btnNextYear.addEventListener("click", () => {
      state.currentDate.setDate(state.currentDate.getDate() + 364);
      renderCalendar();
    });
  }

  if (btnPrevYear) {
    btnPrevYear.addEventListener("click", () => {
      state.currentDate.setDate(state.currentDate.getDate() - 364);
      renderCalendar();
    });
  }

  btnToday.addEventListener("click", () => {
    state.currentDate = getMonday(new Date());
    renderCalendar();
  });

  // Sidebar
  btnAddRunSidebar.addEventListener("click", () => openRunModal());
  btnSettingsSidebar.addEventListener("click", openSettingsModal);
  btnStatsSidebar.addEventListener("click", showStatsPage);
  btnBackStats.addEventListener("click", showCalendarPage);

  // Backup JSON
  if (btnExportJson)
    btnExportJson.addEventListener("click", exportBackupToJSON);
  if (btnTriggerImport)
    btnTriggerImport.addEventListener("click", () => inputImportJson.click());
  if (inputImportJson)
    inputImportJson.addEventListener("change", importBackupFromJSON);

  // Motyw i panel boczny
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", () => {
      const isLight = document.body.classList.toggle("light-mode");
      localStorage.setItem(
        "running_calendar_theme",
        isLight ? "light" : "dark",
      );
      btnThemeToggle.innerHTML = isLight
        ? "<span>🌙</span> Tryb ciemny"
        : "<span>☀️</span> Tryb jasny";
    });
  }

  btnToggleSidebar.addEventListener("click", () => {
    const appContainer = document.querySelector(".app-container");
    if (!appContainer) return;
    appContainer.classList.toggle("sidebar-hidden");
    btnToggleSidebar.innerHTML = appContainer.classList.contains(
      "sidebar-hidden",
    )
      ? "<span>📊</span> Pokaż panel"
      : "<span>📊</span> Ukryj panel";
  });

  // Zamknięcia Modali
  document
    .getElementById("btn-close-run-modal")
    .addEventListener("click", closeRunModal);
  document
    .getElementById("btn-cancel-run-modal")
    .addEventListener("click", closeRunModal);
  document
    .getElementById("btn-close-settings-modal")
    .addEventListener("click", closeSettingsModal);
  document
    .getElementById("btn-cancel-settings-modal")
    .addEventListener("click", closeSettingsModal);

  window.addEventListener("click", (e) => {
    if (e.target === modalRunOverlay) closeRunModal();
    if (e.target === modalSettingsOverlay) closeSettingsModal();
  });

  // Kalkulatory w formularzu biegu
  document
    .getElementById("checkbox-manual-run-num")
    .addEventListener("change", (e) => {
      manualRunNumContainer.style.display = e.target.checked ? "flex" : "none";
    });

  [inputDurationH, inputDurationM, inputDurationS].forEach((input) => {
    input.addEventListener("input", () => {
      setLastEditedGroup("duration");
      updatePaceFromDuration();
    });
  });

  [inputPaceM, inputPaceS].forEach((input) => {
    input.addEventListener("input", () => {
      setLastEditedGroup("pace");
      updateDurationFromPace();
    });
  });

  inputRunDistance.addEventListener("input", () => {
    if (lastEditedCalculatorGroup === "duration") {
      updatePaceFromDuration();
    } else {
      updateDurationFromPace();
    }
  });

  // Usuwanie i zapisywanie formularzy
  document.getElementById("btn-delete-run").addEventListener("click", () => {
    const runId = document.getElementById("input-run-id").value;
    if (runId && confirm("Czy na pewno chcesz usunąć ten bieg?")) {
      state.runs = state.runs.filter((r) => r.id !== runId);
      saveRuns();
      renderCalendar();
      updateStats();
      closeRunModal();
    }
  });

  formRun.addEventListener("submit", (e) => {
    e.preventDefault();
    const runId = document.getElementById("input-run-id").value;
    const runData = {
      id:
        runId ||
        "run_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      date: document.getElementById("input-run-date").value,
      time: document.getElementById("input-run-time").value,
      distance: parseFloat(inputRunDistance.value) || 0,
      hr: parseInt(document.getElementById("input-run-hr").value) || 0,
      durationH: parseInt(inputDurationH.value) || 0,
      durationM: parseInt(inputDurationM.value) || 0,
      durationS: parseInt(inputDurationS.value) || 0,
      paceM: parseInt(inputPaceM.value) || 0,
      paceS: parseInt(inputPaceS.value) || 0,
      weatherType: document.getElementById("select-weather-type").value,
      weatherTemp:
        parseInt(document.getElementById("input-weather-temp").value) || 0,
      manualRunNum: document.getElementById("checkbox-manual-run-num").checked,
      manualRunNumVal: document.getElementById("checkbox-manual-run-num")
        .checked
        ? parseInt(document.getElementById("input-manual-run-num").value) ||
          null
        : null,
      mountainRun: document.getElementById("checkbox-mountain-run").checked,
      notes: document.getElementById("input-run-notes").value.trim(),
    };

    if (runId) {
      const index = state.runs.findIndex((r) => r.id === runId);
      if (index !== -1) state.runs[index] = runData;
    } else {
      state.runs.push(runData);
    }

    saveRuns();
    renderCalendar();
    updateStats();
    closeRunModal();
  });

  formSettings.addEventListener("submit", (e) => {
    e.preventDefault();
    state.settings = {
      ...state.settings,
      offset:
        parseInt(document.getElementById("input-setting-offset").value) || 0,
    };

    saveSettings();
    renderCalendar();
    updateStats();
    closeSettingsModal();
  });
}

// Start aplikacji
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
