import { useMemo } from "react";
import { computeRunMetrics } from "../utils/RunUtils.js";
import {
  getSummaryStats,
  getYearlyStats,
  getMonthlyStats,
  getTopWeeklyStats,
  getStreakStats,
  getMonthlyComparisonStats,
} from "../utils/statsCalculators.js";

import MonthComparisonAccordion from "./stats/MonthComparisonAccordion";
import WeeklyPaceHistoryChart from "./WeeklyPaceHistoryChart";
import YearlyDistanceChart from "./stats/YearlyDistanceChart";

function StatsPage({ runs }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const runsWithMetrics = useMemo(() => computeRunMetrics(runs || []), [runs]);

  const summaryStats = useMemo(() => getSummaryStats(runsWithMetrics), [runsWithMetrics]);
  const yearlyStats = useMemo(() => getYearlyStats(runsWithMetrics), [runsWithMetrics]);
  const monthlyStats = useMemo(() => getMonthlyStats(runsWithMetrics), [runsWithMetrics]);
  const topWeeklyStats = useMemo(() => getTopWeeklyStats(runsWithMetrics), [runsWithMetrics]);
  const streakStats = useMemo(() => getStreakStats(runsWithMetrics), [runsWithMetrics]);
  const monthlyComparisonStats = useMemo(
    () => getMonthlyComparisonStats(runsWithMetrics, currentYear, currentMonth),
    [runsWithMetrics, currentYear, currentMonth]
  );

  return (
    <div className="stats-page glass-panel" id="stats-page">
      <header className="stats-header">
        <h1 className="stats-title">Statistics</h1>
      </header>

      {/* SUMMARY STATS */}
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

      <div className="stats-content chart">
        <div className="stats-section">
          <h3 className="stats-section-title">📅 Yearly Distance</h3>
          <YearlyDistanceChart data={yearlyStats} />
        </div>
      </div>

      <div className="stats-content">
        {/* MONTHLY RANKING */}
        <div className="stats-section">
          <h3 className="stats-section-title">🏆 Monthly Distance Ranking</h3>
          <div id="monthly-stats-container">
            {monthlyStats.map((stat) => (
              <div
                key={stat.key}
                className={`stats-item ${
                  stat.year === currentYear && stat.month === currentMonth
                    ? "is-current-month"
                    : ""
                }`}
              >
                <span className="stats-label">{stat.monthName} {stat.year}</span>
                <span className="stats-values">
                  {Math.round(stat.totalDistance)}.0 km • {stat.runCount}{" "}
                  {stat.runCount === 1 ? "run" : "runs"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP 20 WEEKS */}
        <div className="stats-section">
          <h3 className="stats-section-title">⚡ Top 20 Weekly Distance</h3>
          <div id="weekly-top-stats-container">
            {topWeeklyStats.map((stat, index) => (
              <div className="stats-item" key={stat.weekKey}>
                <span className="stats-label">
                  <span className="rank-number">#{index + 1}</span> {stat.dateRangeLabel}
                </span>
                <span className="stats-values">
                  {Math.round(stat.totalDistance)}.0 km • {stat.runCount}{" "}
                  {stat.runCount === 1 ? "run" : "runs"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP STREAKS */}
        <div className="stats-section">
          <h3 className="stats-section-title">🔥 Running Streaks (&gt; 9 days)</h3>
          <div id="streaks-stats-container">
            {streakStats.map((stat, index) => (
              <div
                key={`${stat.startDate}-${index}`}
                className={`stats-item ${stat.isCurrent ? "is-current-streak" : ""}`}
              >
                <span className="stats-label">
                  <span className="rank-number">#{index + 1}</span> {stat.count} days
                </span>
                <span className="stats-values">
                  {stat.startDate.split("-").reverse().join(".")} -{" "}
                  {stat.isCurrent ? "present 🔥" : stat.endDate.split("-").reverse().join(".")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MONTHLY COMPARISON ACCORDION */}
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