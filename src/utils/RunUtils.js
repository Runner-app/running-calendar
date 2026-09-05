export function getMonday(date) {
    const result = new Date(date);
    const day = result.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;

    result.setDate(result.getDate() - daysFromMonday);

    return result;
}

export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseRunDate(date, time = "00:00") {
    if (!date) return null;

    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);

    return new Date(
        year,
        month - 1,
        day,
        hours || 0,
        minutes || 0
    );
}

export function getRunningWeekNumber(mondayDate, runs) {
  if (!runs || runs.length === 0) return null;
  const runDates = runs.map((r) => parseRunDate(r.date));
  const earliestDate = new Date(Math.min(...runDates));
  const earliestMonday = getMonday(earliestDate);

  const utcMondayDate = Date.UTC(
    mondayDate.getFullYear(),
    mondayDate.getMonth(),
    mondayDate.getDate(),
  );
  const utcEarliestMonday = Date.UTC(
    earliestMonday.getFullYear(),
    earliestMonday.getMonth(),
    earliestMonday.getDate(),
  );

  const diffTime = utcMondayDate - utcEarliestMonday;
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
  const rawWeekNum = diffWeeks + 1;

  if (rawWeekNum > 366) {
    return rawWeekNum - 366;
  }

  return rawWeekNum;
}

export function getWeekKey(mondayDate, runs) {
  const year = mondayDate.getFullYear();
  const weekNum = getRunningWeekNumber(mondayDate, runs) || 0;
  return `Week ${weekNum} (${year})`;
}

export function getPaceZoneIndex(min, sec) {
  const totalSec = (parseInt(min) || 0) * 60 + (parseInt(sec) || 0);
  if (totalSec > 429) return 0;
  if (totalSec < 230) return 19;
  return Math.floor((429 - totalSec) / 10);
}

export function getPaceZoneColor(zoneIndex) {
  if (zoneIndex < 0 || zoneIndex > 19) return "#cccccc";

  return `var(--pace-${zoneIndex})`;
}

export function getHrClass(hr) {
  const heartRate = parseInt(hr) || 0;
  if (heartRate < 130) return "barHrUnder130";
  if (heartRate <= 134) return "barHr130-134";
  if (heartRate <= 139) return "barHr135-139";
  if (heartRate <= 144) return "barHr140-144";
  if (heartRate <= 149) return "barHr145-149";
  if (heartRate <= 154) return "barHr150-154";
  if (heartRate <= 159) return "barHr155-159";
  if (heartRate <= 164) return "barHr160-164";
  return "barHr165-plus";
}

export function computeRunMetrics(runsAsInput) {
  if (!runsAsInput || runsAsInput.length === 0) return [];

  const sortedRuns = [...runsAsInput].sort(
    (a, b) => parseRunDate(a.date) - parseRunDate(b.date),
  );
  let autoRunNumCounter = 1;
  const runDates = new Set(sortedRuns.map((r) => r.date));

  sortedRuns.forEach((run) => {
    let streak = 1;
    let currentDate = parseRunDate(run.date);

    while (true) {
      currentDate.setDate(currentDate.getDate() - 1);
      const prevDateStr = formatDate(currentDate);
      if (runDates.has(prevDateStr)) {
        streak++;
      } else {
        break;
      }
    }

    run.computedNumber = autoRunNumCounter;
    autoRunNumCounter++;
    run.computedStreak = streak;
  });

  return sortedRuns;
}
