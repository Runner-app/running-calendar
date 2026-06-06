import { state, saveRuns, saveSettings } from "./state.js";
import { formatDate } from "./utils.js";
import { renderCalendar, updateStats } from "./calendar.js";

// Modal Run Elements
export const modalRunOverlay = document.getElementById("modal-run-overlay");
export const formRun = document.getElementById("form-run");
const modalRunTitle = document.getElementById("modal-run-title");
const btnDeleteRun = document.getElementById("btn-delete-run");

// Form Inputs
const inputRunId = document.getElementById("input-run-id");
const inputRunDate = document.getElementById("input-run-date");
const inputRunTime = document.getElementById("input-run-time");
export const inputRunDistance = document.getElementById("input-run-distance");
const inputRunHr = document.getElementById("input-run-hr");
export const inputDurationH = document.getElementById("input-duration-h");
export const inputDurationM = document.getElementById("input-duration-m");
export const inputDurationS = document.getElementById("input-duration-s");
export const inputPaceM = document.getElementById("input-pace-m");
export const inputPaceS = document.getElementById("input-pace-s");
const selectWeatherType = document.getElementById("select-weather-type");
const inputWeatherTemp = document.getElementById("input-weather-temp");
const checkboxManualRunNum = document.getElementById("checkbox-manual-run-num");
export const manualRunNumContainer = document.getElementById(
  "manual-run-num-container",
);
const inputManualRunNum = document.getElementById("input-manual-run-num");
const checkboxMountainRun = document.getElementById("checkbox-mountain-run");
const inputRunNotes = document.getElementById("input-run-notes");

// Modal Settings Elements
export const modalSettingsOverlay = document.getElementById(
  "modal-settings-overlay",
);
export const formSettings = document.getElementById("form-settings");
const inputSettingOffset = document.getElementById("input-setting-offset");

export let lastEditedCalculatorGroup = "pace";
export function setLastEditedGroup(val) {
  lastEditedCalculatorGroup = val;
}

export function updatePaceFromDuration() {
  const dist = parseFloat(inputRunDistance.value);
  if (!dist || dist <= 0) return;
  const h = parseInt(inputDurationH.value) || 0;
  const m = parseInt(inputDurationM.value) || 0;
  const s = parseInt(inputDurationS.value) || 0;

  const totalSeconds = h * 3600 + m * 60 + s;
  if (totalSeconds <= 0) return;

  const secondsPerKm = totalSeconds / dist;
  const paceMin = Math.floor(secondsPerKm / 60);
  const paceSec = Math.round(secondsPerKm % 60);

  inputPaceM.value = paceMin;
  inputPaceS.value = paceSec === 60 ? 59 : paceSec;
}

export function updateDurationFromPace() {
  const dist = parseFloat(inputRunDistance.value);
  if (!dist || dist <= 0) return;
  const pm = parseInt(inputPaceM.value) || 0;
  const ps = parseInt(inputPaceS.value) || 0;

  const paceSecondsPerKm = pm * 60 + ps;
  if (paceSecondsPerKm <= 0) return;

  const totalSeconds = paceSecondsPerKm * dist;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);

  inputDurationH.value = h;
  inputDurationM.value = m;
  inputDurationS.value = s === 60 ? 59 : s;
}

export function openRunModal(runId = null, defaultDate = null) {
  formRun.reset();
  if (runId) {
    modalRunTitle.textContent = "Edytuj Bieg";
    btnDeleteRun.style.display = "block";
    const run = state.runs.find((r) => r.id === runId);
    if (run) {
      inputRunId.value = run.id;
      inputRunDate.value = run.date;
      inputRunTime.value = run.time || "08:00";
      inputRunDistance.value = run.distance;
      inputRunHr.value = run.hr || "";
      inputDurationH.value = run.durationH || 0;
      inputDurationM.value = run.durationM || 0;
      inputDurationS.value = run.durationS || 0;
      inputPaceM.value = run.paceM || "";
      inputPaceS.value = run.paceS || "";
      selectWeatherType.value = run.weatherType || "sunny";
      inputWeatherTemp.value = run.weatherTemp || "15";

      if (run.manualRunNum) {
        checkboxManualRunNum.checked = true;
        manualRunNumContainer.style.display = "flex";
        inputManualRunNum.value = run.manualRunNumVal || "";
      } else {
        checkboxManualRunNum.checked = false;
        manualRunNumContainer.style.display = "none";
        inputManualRunNum.value = "";
      }
      checkboxMountainRun.checked = run.mountainRun || false;
      inputRunNotes.value = run.notes || "";
    }
  } else {
    modalRunTitle.textContent = "Dodaj Bieg";
    btnDeleteRun.style.display = "none";
    inputRunId.value = "";
    inputRunDate.value = defaultDate || formatDate(new Date());

    const now = new Date();
    inputRunTime.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    selectWeatherType.value = "sunny";
    inputWeatherTemp.value = "15";
    checkboxManualRunNum.checked = false;
    manualRunNumContainer.style.display = "none";
    inputManualRunNum.value = "";
    checkboxMountainRun.checked = false;
  }
  modalRunOverlay.classList.add("active");
}

export function closeRunModal() {
  modalRunOverlay.classList.remove("active");
}

export function openSettingsModal() {
  const s = state.settings;
  inputSettingOffset.value = s.offset || 0;
  modalSettingsOverlay.classList.add("active");
}

export function closeSettingsModal() {
  modalSettingsOverlay.classList.remove("active");
}
