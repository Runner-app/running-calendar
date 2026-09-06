import { useRef, useEffect, useMemo, useState } from "react";
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

  const [scrollDirection, setScrollDirection] = useState("Next");
  const isScrolling = useRef(false);
  const gridRef = useRef(null);

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
    setScrollDirection("Prev");
    const n = new Date(currentDate);
    n.setDate(n.getDate() - 21);
    setCurrentDate(n);
  };

  const handleNextMonth = () => {
    setScrollDirection("Next");
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
        }, 350);
      }
    };

    gridElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      gridElement.removeEventListener("wheel", handleWheel);
    };
  }, [currentDate]);

  const gridAnimationKey = currentDate.getTime();
  const runsWithMetrics = computeRunMetrics(runs || []);
  const calendarStartDate = getMonday(currentDate);
  const weeklyGoals = settings?.weeklyGoals || {};

  const weatherEmojis = {
    sunny: "☀️ Sunny",
    lightCloud: "🌤️ Light Cloud",
    cloudy: "☁️ Cloudy",
    rainy: "🌧️ Rainy",
    snowy: "❄️ Snowy",
    windy: "💨 Windy",
  };

  const weeksData = useMemo(() => {
    const result = [];
    for (let w = 0; w < 3; w++) {
      const weekMonday = new Date(calendarStartDate.getTime());
      weekMonday.setDate(weekMonday.getDate() + w * 7);
      const weekKey = getWeekKey(weekMonday, runs || []);
      const weekDailyGoal =
        weeklyGoals[weekKey] !== undefined ? parseFloat(weeklyGoals[weekKey]) : 0;

      const weekDates = [];
      const daysInWeek = [];

      for (let d = 0; d < 7; d++) {
        const dDate = new Date(weekMonday.getTime());
        dDate.setDate(dDate.getDate() + d);
        const dateStr = formatDate(dDate);
        weekDates.push(dateStr);

        const runsOnThisDay = runsWithMetrics.filter((r) => r.date === dateStr);
        const dayTotalDist = runsOnThisDay.reduce(
          (sum, run) => sum + (parseFloat(run.distance) || 0),
          0
        );
        const isToday = dateStr === formatDate(new Date());
        const isGoalFailed =
          weekDailyGoal > 0 &&
          (runsOnThisDay.length === 0 || dayTotalDist < weekDailyGoal);

        daysInWeek.push({
          dateStr,
          dayNumber: dDate.getDate(),
          isToday,
          isGoalFailed,
          runs: runsOnThisDay,
        });
      }

      const runsInWeek = runsWithMetrics.filter((r) => weekDates.includes(r.date));
      const totalDist = runsInWeek.reduce(
        (sum, run) => sum + (parseFloat(run.distance) || 0),
        0
      );
      const runsWithHr = runsInWeek.filter((r) => (parseInt(r.hr) || 0) > 0);
      const avgHr =
        runsWithHr.length > 0
          ? Math.round(
              runsWithHr.reduce((sum, r) => sum + r.hr, 0) / runsWithHr.length
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

      let paceText = `--:-- min/km`;
      if (totalDist > 0 && totalSeconds > 0) {
        const avgSecondsPerKm = totalSeconds / totalDist;
        const avgMin = Math.floor(avgSecondsPerKm / 60);
        const avgSec = Math.round(avgSecondsPerKm % 60);
        const avgSecStr = String(avgSec === 60 ? 59 : avgSec).padStart(2, "0");
        paceText = `${avgMin}:${avgSecStr} min/km`;
      }

      const weekNum = getRunningWeekNumber(weekMonday, runs || []);
      const weekNumText = weekNum && weekNum > 0 ? `${weekNum}` : `Week --`;
      const hrText = avgHr ? `${avgHr} bpm` : `-- bpm`;
      const weeklyGoal = weekDailyGoal * 7;
      const distText =
        weekDailyGoal > 0
          ? `${Math.floor(totalDist)}.0 / ${Math.floor(weeklyGoal)}.0 km`
          : `${Math.floor(totalDist)}.0 km`;

      result.push({
        weekKey,
        summary: {
          weekNumText,
          distText,
          hrText,
          paceText,
          weekDailyGoal,
        },
        days: daysInWeek,
      });
    }

    return result;
  }, [calendarStartDate, runsWithMetrics, weeklyGoals, runs]);

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
      <header className="calendarHeader">
        <div className="calendarNavigation">
          <button className="btn btnSecondary navButton" onClick={handlePrevYear}>
            <span>
              <img
                src="/images/icons/fast-backward.svg"
                alt="Previous Year"
                className="yearImage previous"
              />
            </span>
          </button>
          <button className="btn btnSecondary navButton" onClick={handlePrevMonth}>
            <span>
              <img src="/images/icons/arrow-back.svg" alt="Previous Month" />
            </span>
          </button>
          <h2 className="monthTitle">{headerTitle}</h2>
          <button className="btn btnSecondary navButton" onClick={handleNextMonth}>
            <span>
              <img src="/images/icons/arrow-forward.svg" alt="Next Month" />
            </span>
          </button>
          <button className="btn btnSecondary navButton" onClick={handleNextYear}>
            <span>
              <img
                src="/images/icons/fast-forward.svg"
                alt="Next Year"
                className="yearImage"
              />
            </span>
          </button>
          <button className="btn btnSecondary" onClick={handleToday}>
            Today
          </button>
          <button className="btn" onClick={() => onAddRunClick(null, null)}>
            + Add Run
          </button>
        </div>
      </header>

      <div className="calendarWeekdays">
        <div className="weekday">MON</div>
        <div className="weekday">TUE</div>
        <div className="weekday">WED</div>
        <div className="weekday">THU</div>
        <div className="weekday">FRI</div>
        <div className="weekday">SAT</div>
        <div className="weekday">SUN</div>
      </div>

      <div className={`calendarGrid animate${scrollDirection}`} ref={gridRef} key={gridAnimationKey}>
        {weeksData.map((week) => (
          <div className="runWeek" key={`week-${week.weekKey}`}>
            <div className="weekSummaryBar">
              <span className="weekSummaryTitle">{week.summary.weekNumText}</span>
              <span className="weekSummaryItem">
                <img
                  src="/images/icons/graph.svg"
                  alt="Graph"
                  style={{ width: "17px", height: "auto" }}
                />
                {week.summary.distText}
              </span>
              <span className="weekSummaryItem">
                <img
                  src="/images/icons/heart-rate-light.svg"
                  alt="Heart Rate"
                  style={{ width: "17px", height: "auto" }}
                />
                {week.summary.hrText}
              </span>
              <span className="weekSummaryItem">
                <img
                  src="/images/icons/pace-light.svg"
                  alt="Pace"
                  style={{ width: "19px", height: "auto" }}
                />
                {week.summary.paceText}
              </span>
              <span className="weekSummaryItem weekGoalWrapper">
                <img
                  src="/images/icons/goal.svg"
                  alt="Goal"
                  style={{ width: "17px", height: "auto" }}
                />{" "}
                Goal:
                <input
                  type="number"
                  className="inputWeeklyGoal"
                  value={
                    settings?.weeklyGoals?.[week.weekKey] !== undefined
                      ? settings.weeklyGoals[week.weekKey]
                      : week.summary.weekDailyGoal
                  }
                  min="0"
                  step="0.5"
                  onChange={(e) => handleGoalChange(week.weekKey, e.target.value)}
                />{" "}
                km/day
              </span>
            </div>

            <div className="weekDaysGrid">
              {week.days.map((day) => (
                <div
                  className={`dayCell ${day.isGoalFailed ? "goalFailed" : ""}${
                    day.isToday ? " today" : ""
                  }`}
                  key={`day-${day.dateStr}`}
                  onClick={() =>
                    day.runs.length === 0 && onAddRunClick(null, day.dateStr)
                  }
                  style={{
                    cursor: day.runs.length === 0 ? "pointer" : "default",
                  }}
                >
                  <div className="dayHeader">
                    <span className="dayNumber">{day.dayNumber}</span>
                  </div>

                  {day.runs.length > 0 && (
                    <div
                      className={`dayRunContainer ${
                        day.runs.length === 2 ? "double" : ""
                      }`}
                    >
                      {day.runs.map((run) => {
                        const zoneIndex = getPaceZoneIndex(run.paceM, run.paceS);
                        const zoneColor = getPaceZoneColor(zoneIndex);
                        const paceSecStr = String(run.paceS || 0).padStart(
                          2,
                          "0"
                        );

                        const hStr =
                          run.durationH > 0 ? `${run.durationH}:` : "";
                        const mStr = String(run.durationM || 0).padStart(2, "0");
                        const sStr = String(run.durationS || 0).padStart(2, "0");

                        const distFormatted =
                          typeof run.distance === "number"
                            ? run.distance.toFixed(1)
                            : parseFloat(run.distance || 0).toFixed(1);
                        const mountainEmoji = run.mountainRun ? " ⛰️" : "";
                        const notesEmoji = run.notes ? <img src="/images/icons/note.svg" alt="Note" className="icon notesIcon" /> : "";
                        const weather = run.weather_data;

                        return (
                          <div
                            key={run.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddRunClick(run.id);
                            }}
                            className="runSingleDataContainer"
                          >
                            <div
                              className="runBar"
                              style={{ background: zoneColor }}
                            >
                              <img
                                src="/images/icons/pace.svg"
                                alt="Pace"
                                style={{ width: "17px", height: "auto" }}
                              />
                              {run.paceM || 0}:{paceSecStr} min/km
                            </div>

                            {run.hr && parseInt(run.hr) > 0 && (
                              <div
                                className={`runBar ${getHrClass(
                                  run.hr
                                )}`}
                              >
                                <img
                                  src="/images/icons/heart-rate.svg"
                                  alt="Heart rate"
                                  style={{ width: "17px", height: "auto" }}
                                />
                                {run.hr || 0} bpm
                              </div>
                            )}

                            <div className="runBar barDuration">
                              <img
                                src="/images/icons/stopwatch.svg"
                                alt="Stopwatch"
                                style={{ width: "17px", height: "auto" }}
                              />
                              {hStr}{mStr}:{sStr}
                            </div>

                            <div
                              className="runBar barDetails"
                              title={run.notes || ""}
                            >
                              <img
                                src="/images/icons/calendar.svg"
                                alt="Date"
                                style={{ width: "17px", height: "auto" }}
                              />
                              <span>
                                {roundToNearestQuarter(run.time) || "--:--"} •{" "}
                              </span>
                              {run.computedNumber || 0} || {distFormatted} km [
                              {run.computedStreak || 1}]
                              {mountainEmoji}
                              <span className="notes">{notesEmoji}</span>
                            </div>

                            {weather && (
                              <span className="runWeatherTooltip">
                                {weatherEmojis[weather.type] || "☀️"} •{" "}
                                {weather.temp}°C • 💧
                                {weather.humidity || 60}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default CalendarView;