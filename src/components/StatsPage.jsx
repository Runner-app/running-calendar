import { useMemo, useState } from "react";
import {
  computeRunMetrics,
  getWeekKey,
} from "../utils/RunUtils.js";
import WeeklyPaceHistoryChart from "./WeeklyPaceHistoryChart";

function StatsPage({ runs }) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const runsWithMetrics = useMemo(() => {
    return computeRunMetrics(runs || []);
  }, [runs]);

  // Ogólne statystyki
  const summaryStats = useMemo(() => {
    const totalRuns = runsWithMetrics.length;
    const totalDistance = runsWithMetrics.reduce(
      (sum, run) => sum + (parseFloat(run.distance) || 0),
      0
    );

    let currentStreak = 0;
    if (runsWithMetrics.length > 0) {
      const sortedRuns = [...runsWithMetrics].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
        const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
        return dateB - dateA;
      });
      currentStreak = sortedRuns[0].computedStreak || 0;
    }

    return { totalRuns, totalDistance, currentStreak };
  }, [runsWithMetrics]);

  // Ranking Roczny
  const yearlyStats = useMemo(() => {
    const yearlyMap = {};

    runsWithMetrics.forEach((run) => {
      const year = new Date(run.date).getFullYear();
      const distance = parseFloat(run.distance) || 0;

      if (!yearlyMap[year]) {
        yearlyMap[year] = { year, totalDistance: 0, totalRuns: 0 };
      }
      yearlyMap[year].totalDistance += distance;
      yearlyMap[year].totalRuns += 1;
    });

    return Object.values(yearlyMap).sort(
      (a, b) => b.totalDistance - a.totalDistance
    );
  }, [runsWithMetrics]);

  // Ranking Miesięczny
  const monthlyStats = useMemo(() => {
    const monthlyMap = {};
    const startDate = new Date(2019, 8, 1);
    const endDate = new Date();

    let iterDate = new Date(startDate);
    while (iterDate <= endDate) {
      const year = iterDate.getFullYear();
      const month = iterDate.getMonth();
      const monthName = monthNames[month];
      const key = `${year}-${month}`;
      monthlyMap[key] = {
        year,
        month,
        monthName,
        key,
        totalDistance: 0,
        runCount: 0,
      };
      iterDate.setMonth(iterDate.getMonth() + 1);
    }

    runsWithMetrics.forEach((run) => {
      const date = new Date(run.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      const distance = parseFloat(run.distance) || 0;
      if (monthlyMap[key]) {
        monthlyMap[key].totalDistance += distance;
        monthlyMap[key].runCount += 1;
      }
    });
    return Object.values(monthlyMap).sort(
      (a, b) => b.totalDistance - a.totalDistance
    );
  }, [runsWithMetrics]);

// Ranking TOP 20 Tygodni z zakresem dat (od pn do ndz)
const topWeeklyStats = useMemo(() => {
  if (!runsWithMetrics || runsWithMetrics.length === 0) return [];

  const weeksMap = {};

  runsWithMetrics.forEach((run) => {
    if (!run.date) return;
    
    // Tworzymy datę z zabezpieczeniem strefy czasowej
    const [y, m, d] = run.date.split("-").map(Number);
    const runDate = new Date(y, m - 1, d);
    const weekKey = getWeekKey(runDate, runsWithMetrics);

    if (!weeksMap[weekKey]) {
      // Wyliczamy Poniedziałek
      const day = runDate.getDay();
      const diffToMonday = runDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(runDate.getFullYear(), runDate.getMonth(), diffToMonday);

      // Wyliczamy Niedzielę (+6 dni od poniedziałku)
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      // Formatujemy na DD.MM (np. 12.09)
      const formatDayMonth = (d) =>
        `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;

      const mondayStr = formatDayMonth(monday);
      const sundayStr = formatDayMonth(sunday);
      const yearStr = sunday.getFullYear();

      // Wynikowy string: "12.09 - 18.09.2025"
      const dateRangeLabel = `${mondayStr} - ${sundayStr}.${yearStr}`;

      weeksMap[weekKey] = {
        weekKey,
        dateRangeLabel,
        totalDistance: 0,
        runCount: 0,
      };
    }

    weeksMap[weekKey].totalDistance += parseFloat(run.distance) || 0;
    weeksMap[weekKey].runCount += 1;
  });

  return Object.values(weeksMap)
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .slice(0, 20);
}, [runsWithMetrics]);

// Ranking Streaków (> 9 dni)
const streakStats = useMemo(() => {
  if (!runsWithMetrics || runsWithMetrics.length === 0) return [];

  // Wyciągamy unikalne, posortowane rosnąco daty biegów
  const uniqueDates = Array.from(
    new Set(runsWithMetrics.map((r) => r.date).filter(Boolean))
  ).sort((a, b) => new Date(a) - new Date(b));

  if (uniqueDates.length === 0) return [];

  const streaks = [];
  let streakStart = uniqueDates[0];
  let streakEnd = uniqueDates[0];
  let count = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);

    // Różnica w dniach między kolejnymi biegami
    const diffTime = currDate - prevDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Dzień po dniu – kontynuujemy streak
      count++;
      streakEnd = uniqueDates[i];
    } else {
      // Przerwa – zapisujemy poprzedni streak, jeśli wynosił > 9 dni
      if (count > 9) {
        streaks.push({
          count,
          startDate: streakStart,
          endDate: streakEnd,
          isCurrent: false,
        });
      }
      // Resetujemy na nowy streak
      count = 1;
      streakStart = uniqueDates[i];
      streakEnd = uniqueDates[i];
    }
  }

  // Sprawdzamy ostatni (lub obecnie trwający) streak
  if (count > 9) {
    // Sprawdzamy, czy ostatni bieg był dzisiaj lub wczoraj (czy jest aktywny)
    const lastRunDate = new Date(uniqueDates[uniqueDates.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffToToday = Math.round((today - lastRunDate) / (1000 * 60 * 60 * 24));
    
    const isCurrent = diffToToday <= 1;

    streaks.push({
      count,
      startDate: streakStart,
      endDate: isCurrent ? null : streakEnd, // null dla trwającego streaku
      isCurrent,
    });
  }

  // Formatowanie dat na DD.MM.YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  // Sortujemy od najdłuższego streaku
  return streaks
    .sort((a, b) => b.count - a.count)
    .map((s) => ({
      ...s,
      label: `${s.count} ${s.count === 1 ? "day" : "days"} (${formatDate(s.startDate)} - ${
        s.isCurrent ? "present" : formatDate(s.endDate)
      })`,
    }));
}, [runsWithMetrics]);

function MonthComparisonAccordion({ monthData }) {
  const [isOpen, setIsOpen] = useState(false);

  // Pierwsza pozycja to rekord danego miesiąca
  const bestYear = monthData.years[0];

  return (
    <div className="month-accordion-item">
      <div 
        className="month-accordion-header" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="month-info">
          <span className="month-name">{monthData.monthName}</span>
          <span className="month-best-badge">
            👑 Record: {bestYear ? `${bestYear.distance} km (${bestYear.year})` : "No data"}
          </span>
        </div>
        <span className={`accordion-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </div>

      {isOpen && (
        <div className="month-accordion-content">
          {monthData.years.map((y, idx) => (
            <div 
              key={y.year} 
              className={`stats-item ${y.isCurrent ? "is-current-year" : ""}`}
            >
              <span className="stats-label">
                <span className="rank-number">#{idx + 1}</span> {y.year}
              </span>
              <span className="stats-values">
                <strong>{y.distance} km</strong> • {y.runs} {y.runs === 1 ? "run" : "runs"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Inside StatsPage component:
// ----------------------------------------------------

// Ranking Porównawczy Miesięcy (Styczeń - Grudzień)
const monthlyComparisonStats = useMemo(() => {
  if (!runsWithMetrics || runsWithMetrics.length === 0) return [];

  // Przygotowujemy strukturę dla 12 miesięcy
  const monthsBase = monthNames.map((name, index) => ({
    monthIndex: index,
    monthName: name,
    yearsMap: {},
  }));

  runsWithMetrics.forEach((run) => {
    if (!run.date) return;
    const date = new Date(run.date);
    const mIndex = date.getMonth();
    const year = date.getFullYear();
    const dist = parseFloat(run.distance) || 0;

    if (!monthsBase[mIndex].yearsMap[year]) {
      monthsBase[mIndex].yearsMap[year] = { year, distance: 0, runs: 0 };
    }

    monthsBase[mIndex].yearsMap[year].distance += dist;
    monthsBase[mIndex].yearsMap[year].runs += 1;
  });

  return monthsBase.map((m) => {
    const yearsSorted = Object.values(m.yearsMap)
      .map((y) => ({
        ...y,
        distance: Math.round(y.distance),
        isCurrent: y.year === currentYear && m.monthIndex === currentMonth,
      }))
      .sort((a, b) => b.distance - a.distance);

    return {
      monthIndex: m.monthIndex,
      monthName: m.monthName,
      years: yearsSorted,
    };
  });
}, [runsWithMetrics, currentYear, currentMonth]);

  return (
    <div className="stats-page glass-panel" id="stats-page">
      <header className="stats-header">
        <h2 className="stats-title">Statistics</h2>
      </header>

      <div className="stats-summary-grid">
        <div className="stat-card">
          <div className="stat-icon">🏁</div>
          <div className="stat-info">
            <span className="stat-label">Total Runs</span>
            <span className="stat-value">{summaryStats.totalRuns}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🗺️</div>
          <div className="stat-info">
            <span className="stat-label">Total Distance</span>
            <span className="stat-value">
              {Math.floor(summaryStats.totalDistance).toLocaleString("pl-PL")} km
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-info">
            <span className="stat-label">Day streak</span>
            <span className="stat-value">
              {summaryStats.currentStreak}{" "}
              {summaryStats.currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      </div>

      <div className="stats-content">
        <div className="stats-section">
          <h3 className="stats-section-title">📅 Yearly Distance Ranking</h3>
          <div id="yearly-stats-container">
            {yearlyStats.length === 0 ? (
              <div className="stats-empty">No data available</div>
            ) : (
              yearlyStats.map((stat) => {
                const isCurrentYear = stat.year === currentYear;
                return (
                  <div
                    className={`stats-item ${
                      isCurrentYear ? "is-current-year" : ""
                    }`}
                    key={stat.year}
                  >
                    <span className="stats-label">{stat.year}</span>
                    <span className="stats-values">
                      {Math.round(stat.totalDistance)} km • {stat.totalRuns}{" "}
                      runs
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="stats-section">
          <h3 className="stats-section-title">🏆 Monthly Distance Ranking</h3>
          <div id="monthly-stats-container">
            {monthlyStats.length === 0 ? (
              <div className="stats-empty">No data available</div>
            ) : (
              monthlyStats.map((stat) => {
                const isCurrentMonth =
                  stat.year === currentYear && stat.month === currentMonth;

                return (
                  <div
                    className={`stats-item ${
                      isCurrentMonth ? "is-current-month" : ""
                    }`}
                    key={stat.key}
                  >
                    <span className="stats-label">
                      {stat.monthName} {stat.year}
                    </span>
                    <span className="stats-values">
                      {Math.round(stat.totalDistance)}.0 km • {stat.runCount}{" "}
                      {`${stat.runCount === 1 ? "run" : "runs"}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* NOWA SEKCJA: TOP 20 TYGODNI */}
        <div className="stats-section">
          <h3 className="stats-section-title">⚡ Top 20 Weekly Distance</h3>
          <div id="weekly-top-stats-container">
            {topWeeklyStats.length === 0 ? (
              <div className="stats-empty">No data available</div>
            ) : (
              topWeeklyStats.map((stat, index) => (
                <div className="stats-item" key={stat.weekKey}>
                  <span className="stats-label">
                    <span className="rank-number">{index + 1} ||</span> {stat.dateRangeLabel}
                  </span>
                  <span className="stats-values">
                    {Math.round(stat.totalDistance)}.0 km • {stat.runCount}{" "}
                    {`${stat.runCount === 1 ? "run" : "runs"}`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TOP STREAKS (> 9 DNI) */}
        <div className="stats-section">
          <h3 className="stats-section-title">🔥 Running Streaks (&gt; 9 days)</h3>
          <div id="streaks-stats-container">
            {streakStats.length === 0 ? (
              <div className="stats-empty">No streaks over 9 days yet</div>
            ) : (
              streakStats.map((stat, index) => (
                <div
                  className={`stats-item ${stat.isCurrent ? "is-current-streak" : ""}`}
                  key={`${stat.startDate}-${index}`}
                >
                  <span className="stats-label">
                    <span className="rank-number">#{index + 1}</span> {stat.count} days
                  </span>
                  <span className="stats-values">
                    {stat.startDate ? stat.startDate.split("-").reverse().join(".") : ""}{" "}
                    - {stat.isCurrent ? "present 🔥" : stat.endDate.split("-").reverse().join(".")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PORÓWNANIE MIESIĘCY ROK DO ROKU */}
        <div className="stats-section full-width-section">
          <h3 className="stats-section-title">📊 Monthly Performance by Year</h3>
          <div className="monthly-comparison-grid">
            {monthlyComparisonStats.map((m) => (
              <MonthComparisonAccordion key={m.monthName} monthData={m} />
            ))}
          </div>
        </div>
      </div>

      <WeeklyPaceHistoryChart runs={runs} />
    </div>
  );
}

export default StatsPage;