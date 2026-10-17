const DISTANCE_TOLERANCE_KM = 0.01;

export const PERSONAL_RECORD_DISTANCES = [
  {
    id: "5k",
    label: "5 km",
    distanceKm: 5,
  },
  {
    id: "10k",
    label: "10 km",
    distanceKm: 10,
  },
  {
    id: "halfMarathon",
    label: "Half marathon",
    distanceKm: 21.0975,
  },
  {
    id: "marathon",
    label: "Marathon",
    distanceKm: 42.195,
  },
];

function getRunDate(date) {
  if (!date) return null;
  // Zachowujemy datę kalendarzową z bazy, bez
  // niepotrzebnej konwersji strefy czasowej.
  const match = String(date).match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const parsedDate = new Date(`${match[1]}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : match[1];
}

function getRunDurationSeconds(run) {
  return (
    Number(run.durationH ?? 0) * 3600 +
    Number(run.durationM ?? 0) * 60 +
    Number(run.durationS ?? 0)
  );
}

function isValidRun(run) {
  const distance = Number(run.distance);
  const duration = getRunDurationSeconds(run);
  return (
    Number.isFinite(distance) &&
    distance > 0 &&
    Number.isFinite(duration) &&
    duration > 0 &&
    Boolean(getRunDate(run.date))
  );
}

function formatRecordDate(date) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

function findBestRecord(runs, target) {
  const matchingRuns = runs.filter((run) => {
    const distance = Number(run.distance);
    return Math.abs(distance - target.distanceKm) <= DISTANCE_TOLERANCE_KM;
  });
  if (matchingRuns.length === 0) {
    return null;
  }
  const bestRun = matchingRuns.reduce((best, run) => {
    return getRunDurationSeconds(run) < getRunDurationSeconds(best)
      ? run
      : best;
  });

  const date = getRunDate(bestRun.date);
  const duration = getRunDurationSeconds(bestRun);
  const distance = Number(bestRun.distance);

  return {
    ...target,
    duration,
    distance,
    date,
    formattedDate: formatRecordDate(date),
    paceSecondsPerKm: duration / distance,
    runId: bestRun.id ?? null,
  };
}

export function getPersonalRecords(runs = []) {
  const validRuns = Array.isArray(runs) ? runs.filter(isValidRun) : [];

  return PERSONAL_RECORD_DISTANCES.map((target) => ({
    ...target,
    record: findBestRecord(validRuns, target),
  }));
}
