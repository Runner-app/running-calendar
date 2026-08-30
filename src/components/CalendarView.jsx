import { useRef, useEffect, useMemo } from "react";
import {
  formatDate,
  getWeekKey,
  getRunningWeekNumber,
  computeRunMetrics,
  getMonday,
  getPaceZoneIndex,
  getPaceZoneColor,
  getHrClass,
} from "../utils/RunUtils.js";

function CalendarView({
  currentDate,
  setCurrentDate,
  runs,
  settings,
  onSaveSettings,
  onAddRunClick,
}) {
  const headerTitle = useMemo(() => {
    const startDate = new Date(currentDate);
    const endDate = new Date(currentDate);
    endDate.setDate(endDate.getDate() + 20);
    const formatter = new Intl.DateTimeFormat("en-US", { month: "long" });

    const startMonth = formatter.format(startDate);
    const startYear = startDate.getFullYear();
    const endMonth = formatter.format(endDate);
    const endYear = endDate.getFullYear();

    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startMonth} ${startYear}`;
    }
    if (startYear === endYear) {
      return `${startMonth} – ${endMonth} ${startYear}`;
    }
    return `${startMonth} ${startYear} – ${endMonth} ${endYear}`;
  }, [currentDate]);

  const handlePrevMonth = () => {
    const n = new Date(currentDate);
    n.setDate(n.getDate() - 21);
    setCurrentDate(n);
  };
  const handleNextMonth = () => {
    const n = new Date(currentDate);
    n.setDate(n.getDate() + 21);
    setCurrentDate(n);
  };
  const handlePrevYear = () => {
    const n = new Date(currentDate);
    n.setFullYear(n.getFullYear() - 1);
    setCurrentDate(n);
  };
  const handleNextYear = () => {
    const n = new Date(currentDate);
    n.setFullYear(n.getFullYear() + 1);
    setCurrentDate(n);
  };
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const isScrolling = useRef(false);
  const gridRef = useRef(null);

  useEffect(() => {
    const gridElement = gridRef.current;
    if (!gridElement) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        if (isScrolling.current) return;
        isScrolling.current = true;

        if (e.deltaY > 0) {
          handleNextMonth();
        } else {
          handlePrevMonth();
        }

        setTimeout(() => {
          isScrolling.current = false;
        }, 400);
      }
    };

    gridElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      gridElement.removeEventListener("wheel", handleWheel);
    };
  }, [currentDate]);

  const runsWithMetrics = computeRunMetrics(runs || []);
  const calendarStartDate = getMonday(currentDate);
  const gridElements = [];
  const dayGoalsMap = {};
  const weeklyGoals = settings?.weeklyGoals || {};

  // Mapa emotek dla tooltipa pogodowego
  const weatherEmojis = {
    sunny: "☀️ Sunny",
    cloudy: "☁️ Cloudy",
    rainy: "🌧️ Rainy",
    snowy: "❄️ Snowy",
    windy: "💨 Windy",
  };

  for (let w = 0; w < 3; w++) {
    const weekMonday = new Date(calendarStartDate.getTime());
    weekMonday.setDate(weekMonday.getDate() + w * 7);
    const weekKey = getWeekKey(weekMonday, runs || []);
    const weekDailyGoal =
      weeklyGoals[weekKey] !== undefined ? parseFloat(weeklyGoals[weekKey]) : 0;

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekMonday.getTime());
      dayDate.setDate(dayDate.getDate() + d);
      dayGoalsMap[formatDate(dayDate)] = weekDailyGoal;
    }
  }

  for (let i = 0; i < 21; i++) {
    const currentGridDate = new Date(calendarStartDate.getTime());
    currentGridDate.setDate(calendarStartDate.getDate() + i);
    const dateStr = formatDate(currentGridDate);

    if (i % 7 === 0) {
      const weekMonday = new Date(currentGridDate.getTime());
      const weekKey = getWeekKey(weekMonday, runs || []);
      const weekDailyGoal =
        weeklyGoals[weekKey] !== undefined
          ? parseFloat(weeklyGoals[weekKey])
          : 0;
      const weekDates = [];

      for (let d = 0; d < 7; d++) {
        const dDate = new Date(weekMonday.getTime());
        dDate.setDate(dDate.getDate() + d);
        weekDates.push(formatDate(dDate));
      }

      const runsInWeek = runsWithMetrics.filter((r) =>
        weekDates.includes(r.date),
      );
      const totalDist = runsInWeek.reduce(
        (sum, run) => sum + (parseFloat(run.distance) || 0),
        0,
      );
      const runsWithHr = runsInWeek.filter((r) => (parseInt(r.hr) || 0) > 0);
      const avgHr =
        runsWithHr.length > 0
          ? Math.round(
              runsWithHr.reduce((sum, r) => sum + r.hr, 0) / runsWithHr.length,
            )
          : null;

      let totalSeconds = 0;
      runsInWeek.forEach((run) => {
        const h = parseInt(run.durationH) || 0;
        const m = parseInt(run.durationM) || 0;
        const s = parseInt(run.durationS) || 0;
        const durationSeconds = h * 3600 + m * 60 + s;
        if (durationSeconds > 0) {
          totalSeconds += durationSeconds;
        } else {
          const paceSec =
            (parseInt(run.paceM) || 0) * 60 + (parseInt(run.paceS) || 0);
          totalSeconds += paceSec * (parseFloat(run.distance) || 0);
        }
      });

      let avgPaceStr = "--:--";
      let paceText = `--:-- min/km`;
      if (totalDist > 0 && totalSeconds > 0) {
        const avgSecondsPerKm = totalSeconds / totalDist;
        const avgMin = Math.floor(avgSecondsPerKm / 60);
        const avgSec = Math.round(avgSecondsPerKm % 60);
        const avgSecStr = String(avgSec === 60 ? 59 : avgSec).padStart(2, "0");
        avgPaceStr = `${avgMin}:${avgSecStr}`;
        paceText = `${avgPaceStr} min/km`;
      }

      const weekNum = getRunningWeekNumber(weekMonday, runs || []);
      const weekNumText = weekNum && weekNum > 0 ? `${weekNum}` : `Week --`;
      const hrText = avgHr ? `${avgHr} bpm` : `-- bpm`;

      const weeklyGoal = weekDailyGoal * 7;
      let distText =
        weekDailyGoal > 0
          ? `${Math.floor(totalDist)}.0 / ${Math.floor(weeklyGoal)}.0 km`
          : `${Math.floor(totalDist)}.0 km`;

      gridElements.push({
        type: "summary",
        id: `summary-${weekKey}`,
        weekKey: weekKey,
        weekNumText: weekNumText,
        distText: distText,
        hrText: hrText,
        paceText: paceText,
        weekDailyGoal: weekDailyGoal,
      });
    }

    const runsOnThisDay = runsWithMetrics.filter((r) => r.date === dateStr);
    const currentDailyGoal =
      dayGoalsMap[dateStr] !== undefined ? dayGoalsMap[dateStr] : 14;
    const dayTotalDist = runsOnThisDay.reduce(
      (sum, run) => sum + (parseFloat(run.distance) || 0),
      0,
    );
    const isToday = dateStr === formatDate(new Date());
    const isGoalFailed =
      currentDailyGoal > 0 &&
      (runsOnThisDay.length === 0 || dayTotalDist < currentDailyGoal);

    gridElements.push({
      type: "day",
      id: `day-${dateStr}`,
      dateStr: dateStr,
      dayNumber: currentGridDate.getDate(),
      isToday: isToday,
      isGoalFailed: isGoalFailed,
      runs: runsOnThisDay,
      currentDailyGoal: currentDailyGoal,
    });
  }

  const handleGoalChange = (weekKey, value) => {
    const val = parseFloat(value);
    const targetVal = isNaN(val) ? 0 : val;
    const updatedSettings = {
      ...settings,
      weeklyGoals: {
        ...(settings?.weeklyGoals || {}),
        [weekKey]: targetVal,
      },
    };
    onSaveSettings(updatedSettings);
  };

  const roundToNearestQuarter = (timeStr) => {
  if (!timeStr) return "--:--";
  const [hStr, mStr] = timeStr.split(":");
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const totalMinutes = hours * 60 + minutes;
  const roundedMinutes = Math.round(totalMinutes / 15) * 15;
  const finalHours = Math.floor(roundedMinutes / 60) % 24;
  const finalMinutes = roundedMinutes % 60;

  const formattedH = String(finalHours).padStart(2, "0");
  const formattedM = String(finalMinutes).padStart(2, "0");

  return `${formattedH}:${formattedM}`;
};

  return (
    <>
      <header className="calendar-header">
        <div className="calendar-navigation">
          <button className="btn btn-secondary nav-btn" onClick={handlePrevYear}>
            <span><img src="/images/fast-backward.svg" alt="Previous Year" className="yearImage previous" /></span>
          </button>
          <button className="btn btn-secondary  nav-btn" onClick={handlePrevMonth}>
            <span><img src="/images/arrow-back.svg" alt="Previous Month" /></span>
          </button>
          <h2 className="month-title">{headerTitle}</h2>
          <button className="btn btn-secondary nav-btn" onClick={handleNextMonth}>
            <span><img src="/images/arrow-forward.svg" alt="Next Month" /></span>
          </button>
          <button className="btn btn-secondary nav-btn" onClick={handleNextYear}>
            <span><img src="/images/fast-forward.svg" alt="Next Year" className="yearImage" /></span>
          </button>
          <button className="btn btn-secondary btn-today" onClick={handleToday}>
            Today
          </button>
          <button className="btn" onClick={() => onAddRunClick(null, null)}>
            + Add Run
          </button>
        </div>
      </header>

      <div className="calendar-weekdays">
        <div className="weekday">Mon</div>
        <div className="weekday">Tue</div>
        <div className="weekday">Wed</div>
        <div className="weekday">Thu</div>
        <div className="weekday">Fri</div>
        <div className="weekday">Sat</div>
        <div className="weekday">Sun</div>
      </div>

      <div className="calendar-grid" ref={gridRef}>
        {gridElements.map((el, idx) => {
          if (el.type === "summary") {
            return (
              <div
                className="week-summary-bar"
                key={`summary-${el.weekKey}-${idx}`}
              >
                <span className="week-summary-title">{el.weekNumText}</span>
                <span className="week-summary-item">
                  <img src="/images/graph.svg" alt="Graph" style={{ width: "17px", height: "auto" }} />
                  {el.distText}
                </span>
                <span className="week-summary-item">
                  <img src="/images/heart-rate-light.svg" alt="Heart Rate" style={{ width: "17px", height: "auto" }} />
                  {el.hrText}
                </span>
                <span className="week-summary-item">
                  <img src="/images/pace-light.svg" alt="Pace" style={{ width: "19px", height: "auto" }} />
                  {el.paceText}
                </span>
                <span className="week-summary-item week-goal-wrapper">
                  <img src="/images/goal.svg" alt="Goal" style={{ width: "17px", height: "auto" }} /> Goal:
                  <input
                    type="number"
                    className="input-weekly-goal"
                    value={
                      settings?.weeklyGoals?.[el.weekKey] !== undefined
                        ? settings.weeklyGoals[el.weekKey]
                        : el.weekDailyGoal
                    }
                    min="0"
                    step="0.5"
                    onChange={(e) =>
                      handleGoalChange(el.weekKey, e.target.value)
                    }
                  />{" "}
                  km/day
                </span>
              </div>
            );
          }

          return (
            <div
              className={`day-cell${el.isGoalFailed ? " goal-failed" : ""}${el.isToday ? " today" : ""}`}
              key={`day-${el.dateStr}-${idx}`}
              onClick={() =>el.runs.length === 0 && onAddRunClick(null, el.dateStr)}
              style={{ cursor: el.runs.length === 0 ? "pointer" : "default" }}
            >
              <div className="day-header">
                <span className="day-number">{el.dayNumber}</span>
              </div>

              {el.runs.length > 0 && (
                <div
                  className={`day-run-container ${el.runs.length == 2 ? "double" : ""}`}
                >
                  {el.runs.map((run) => {
                    const zoneIndex = getPaceZoneIndex(run.paceM, run.paceS);
                    const zoneColor = getPaceZoneColor(zoneIndex);
                    const paceSecStr = String(run.paceS || 0).padStart(2, "0");

                    const hStr = run.durationH > 0 ? `${run.durationH}:` : "";
                    const mStr = String(run.durationM || 0).padStart(2, "0");
                    const sStr = String(run.durationS || 0).padStart(2, "0");

                    const distFormatted =
                      typeof run.distance === "number"
                        ? run.distance.toFixed(1)
                        : parseFloat(run.distance || 0).toFixed(1);
                    const mountainEmoji = run.mountainRun ? " ⛰️" : "";
                    const notesEmoji = run.notes ? " 📝" : "";
                    const weather = run.weather_data;

                    return (
                      <div
                        key={run.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddRunClick(run.id);
                        }}
                        className="run-single-data-container"
                      >
                        <div className="run-bar bar-pace" style={{ background: zoneColor }}>
                        <img src="/images/pace.svg" alt="Pace" style={{ width: "17px", height: "auto" }} />
                          {run.paceM || 0}:{paceSecStr} min/km
                        </div>

                        {run.hr && parseInt(run.hr) > 0 && (
                          <div className={`run-bar bar-hr ${getHrClass(run.hr)}`}>
                            <img src="/images/heart-rate.svg" alt="Heart rate" style={{ width: "17px", height: "auto" }} />
                            {run.hr || 0} bpm
                          </div>
                        )}

                        <div className="run-bar bar-duration">
                          <img src="/images/stopwatch.svg" alt="Stopwatch" style={{ width: "17px", height: "auto" }} />
                          {hStr}{mStr}:{sStr}
                        </div>

                        <div
                          className="run-bar bar-details"
                          title={run.notes || ""}
                        >
                          <img src="/images/date.svg" alt="Date" style={{ width: "17px", height: "auto" }} />
                          <span>{ roundToNearestQuarter(run.time) || "--:--"} • </span>
                          {run.computedNumber || 0} || {distFormatted} km [
                          {run.computedStreak || 1}]{mountainEmoji}
                          {notesEmoji}
                        </div>

                        {weather && (
                          <span className="run-weather-tooltip">
                            {weatherEmojis[weather.type] || "☀️"} •{" "}
                            {weather.temp}°C • 💧{weather.humidity || 60}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default CalendarView;
