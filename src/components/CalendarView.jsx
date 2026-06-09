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

function CalendarView({currentDate, setCurrentDate, onToggleSidebar, isSidebarOpen, runs, theme, onToggleTheme,
  settings, onSaveSettings, onAddRunClick}) {
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

  for (let w = 0; w < 3; w++) {
    const weekMonday = new Date(calendarStartDate.getTime());
    weekMonday.setDate(weekMonday.getDate() + w * 7);
    const weekKey = getWeekKey(weekMonday, runs || []);
    const weekDailyGoal =
      weeklyGoals[weekKey] !== undefined
        ? parseFloat(weeklyGoals[weekKey])
        : 14;

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
          : 14;
      const weekDates = [];

      for (let d = 0; d < 7; d++) {
        const dDate = new Date(weekMonday.getTime());
        dDate.setDate(dDate.getDate() + d);
        weekDates.push(formatDate(dDate));
      }

      const runsInWeek = runsWithMetrics.filter((r) =>
        weekDates.includes(r.date),
      );
      const totalDist = runsInWeek.reduce((sum, run) => sum + (parseFloat(run.distance) || 0), 0);
      const runsWithHr = runsInWeek.filter((r) => (parseInt(r.hr) || 0) > 0);
      const avgHr = runsWithHr.length > 0 ? Math.round(runsWithHr.reduce((sum, r) => sum + r.hr, 0) / runsWithHr.length) : null;

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
      let paceText = `🏃 Avg pace: --:-- /km`;
      if (totalDist > 0 && totalSeconds > 0) {
        const avgSecondsPerKm = totalSeconds / totalDist;
        const avgMin = Math.floor(avgSecondsPerKm / 60);
        const avgSec = Math.round(avgSecondsPerKm % 60);
        const avgSecStr = String(avgSec === 60 ? 59 : avgSec).padStart(2, "0");
        avgPaceStr = `${avgMin}:${avgSecStr}`;
        paceText = `🏃 ${avgPaceStr} min/km`;
      }

      const weekNum = getRunningWeekNumber(weekMonday, runs || []);
      const weekNumText = weekNum && weekNum > 0 ? `${weekNum}` : `Week --`;
      const hrText = avgHr ? `❤️ ${avgHr} bpm` : `❤️ -- bpm`;

      const weeklyGoal = weekDailyGoal * 7;
      let distText =
        weekDailyGoal > 0
          ? `📈 ${totalDist.toFixed(1)} / ${weeklyGoal.toFixed(1)} km`
          : `📈 ${totalDist.toFixed(1)} km`;

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

  return (
    <>
      <header className="calendar-header">
        <div className="calendar-navigation">
          <button className="nav-btn" onClick={handlePrevYear} title="Previous year">
            &lt;&lt;
          </button>
          <button className="nav-btn" onClick={handlePrevMonth} title="Previous month">
            &lt;
          </button>
          <h2 className="month-title">{headerTitle}</h2>
          <button className="nav-btn" onClick={handleNextMonth} title="Next month">
            &gt;
          </button>
          <button className="nav-btn" onClick={handleNextYear} title="Next year">
            &gt;&gt;
          </button>
          <button className="btn btn-secondary btn-today" onClick={handleToday} title="Back to current day">
            Today
          </button>
        </div>
        <div className="calendar-actions">
          <button className="btn btn-secondary" onClick={onToggleSidebar} title="Show/Hide sidebar">
            📊 {isSidebarOpen ? "Hide" : "Show"} Panel
          </button>
          <button className="btn btn-secondary" onClick={onToggleTheme} title="Toggle theme">
            {theme === "dark" ? '🌙' : '☀️'}
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
              <div className="week-summary-bar" key={`summary-${el.weekKey}-${idx}`}>
                <span className="week-summary-title">{el.weekNumText}</span>
                <span className="week-summary-item">{el.distText}</span>
                <span className="week-summary-item">{el.hrText}</span>
                <span className="week-summary-item">{el.paceText}</span>
                <span className="week-summary-item week-goal-wrapper">
                  🎯 Goal:
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
              className={`day-cell ${el.isToday ? "today" : ""}`}
              key={`day-${el.dateStr}-${idx}`}
              onClick={() =>
                el.runs.length === 0 && onAddRunClick(null, el.dateStr)
              }
              style={{ cursor: el.runs.length === 0 ? "pointer" : "default" }}
            >
              <div className="day-header">
                <span className="day-number">{el.dayNumber}</span>
                <button
                  className="add-run-btn-cell"
                  title="Add run"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddRunClick(null, el.dateStr);
                  }}
                >
                  ➕
                </button>
              </div>

              {el.runs.length > 0 && (
                <div className={`day-run-container ${el.isGoalFailed ? "goal-failed" : ""}`}>
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

                    return (
                      <div key={run.id} onClick={(e) => {e.stopPropagation();onAddRunClick(run.id);}} className="run-single-data-container">
                        <div className="run-bar" style={{ background: zoneColor }}>
                          🏃 {run.paceM || 0}:{paceSecStr} min/km
                        </div>

                        {run.hr && parseInt(run.hr) > 0 && (
                          <div className={`run-bar ${getHrClass(run.hr)}`}>
                            ❤️ {run.hr || 0} bpm
                          </div>
                        )}

                        <div className="run-bar bar-duration">
                          ⏱️ {hStr}{mStr}:{sStr}
                        </div>

                        <div className="run-bar bar-details" title={run.notes || ""}>
                          <span>🕖 {run.time || "--:--"} • </span>
                          {run.computedNumber || 0} || {distFormatted} km [
                          {run.computedStreak || 1}]{mountainEmoji}
                          {notesEmoji}
                        </div>
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
