export const LOCAL_STORAGE_RUNS_KEY = "running_calendar_runs";
export const LOCAL_STORAGE_SETTINGS_KEY = "running_calendar_settings";

export let state = {
  currentDate: null, // Inicjalizowane w main.js przy starcie
  runs: [],
  settings: {
    offset: 0,
    weeklyGoals: {},
  },
};

export function saveRuns() {
  localStorage.setItem(LOCAL_STORAGE_RUNS_KEY, JSON.stringify(state.runs));
}

export function saveSettings() {
  localStorage.setItem(
    LOCAL_STORAGE_SETTINGS_KEY,
    JSON.stringify(state.settings),
  );
}

export function loadData() {
  const savedRuns = localStorage.getItem(LOCAL_STORAGE_RUNS_KEY);
  if (savedRuns) {
    state.runs = JSON.parse(savedRuns);
  }

  const savedSettings = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
  if (savedSettings) {
    const parsed = JSON.parse(savedSettings);
    state.settings = { ...state.settings, ...parsed };
    if (!state.settings.weeklyGoals) {
      state.settings.weeklyGoals = {};
    }
  }

  const savedTheme = localStorage.getItem("running_calendar_theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    const themeBtn = document.getElementById("btn-theme-toggle");
    if (themeBtn) {
      themeBtn.innerHTML = "<span>🌙</span> Dark mode";
    }
  }
}
