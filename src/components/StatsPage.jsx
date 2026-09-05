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
    <div className="statsPage glassPanel" id="statsPage">
      <header className="statsHeader">
        <h1 className="statsTitle">Statistics</h1>
      </header>

      {/* SUMMARY STATS */}
      <div className="statsSummaryGrid">
        <div className="statCard">
          <div className="statIcon">🏁</div>
          <div className="statInfo">
            <span className="statLabel">Total Runs</span>
            <span className="statValue">{summaryStats.totalRuns}</span>
          </div>
        </div>
        <div className="statCard">
          <div className="statIcon">🗺️</div>
          <div className="statInfo">
            <span className="statLabel">Total Distance</span>
            <span className="statValue">
              {Math.floor(summaryStats.totalDistance).toLocaleString("pl-PL")} km
            </span>
          </div>
        </div>
        <div className="statCard">
          <div className="statIcon">🔥</div>
          <div className="statInfo">
            <span className="statLabel">Day streak</span>
            <span className="statValue">
              {summaryStats.currentStreak}{" "}
              {summaryStats.currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      </div>

      <div className="statsContent chart">
        <div className="statsSection">
          <h3 className="statsSectionTitle">📅 Yearly Distance</h3>
          <YearlyDistanceChart data={yearlyStats} />
        </div>
      </div>

      <div className="statsContent">
        {/* MONTHLY RANKING */}
        <div className="statsSection">
          <h3 className="statsSectionTitle">🏆 Monthly Distance Ranking</h3>
          <div id="monthlyStatsContainer">
            {monthlyStats.map((stat) => (
              <div
                key={stat.key}
                className={`statsItem ${
                  stat.year === currentYear && stat.month === currentMonth
                    ? "isCurrentMonth"
                    : ""
                }`}
              >
                <span className="statsLabel">{stat.monthName} {stat.year}</span>
                <span className="statsValues">
                  {Math.round(stat.totalDistance)}.0 km • {stat.runCount}{" "}
                  {stat.runCount === 1 ? "run" : "runs"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP 20 WEEKS */}
        <div className="statsSection">
          <h3 className="statsSectionTitle">⚡ Top 20 Weekly Distance</h3>
          <div id="weeklyTopStatsContainer">
            {topWeeklyStats.map((stat, index) => (
              <div className="statsItem" key={stat.weekKey}>
                <span className="statsLabel">
                  <span className="rankNumber">#{index + 1}</span> {stat.dateRangeLabel}
                </span>
                <span className="statsValues">
                  {Math.round(stat.totalDistance)}.0 km • {stat.runCount}{" "}
                  {stat.runCount === 1 ? "run" : "runs"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP STREAKS */}
        <div className="statsSection">
          <h3 className="statsSectionTitle">🔥 Running Streaks (&gt; 9 days)</h3>
          <div id="streaksTopStatsContainer">
            {streakStats.map((stat, index) => (
              <div
                key={`${stat.startDate}-${index}`}
                className={`statsItem ${stat.isCurrent ? "isCurrentStreak" : ""}`}
              >
                <span className="statsLabel">
                  <span className="rankNumber">#{index + 1}</span> {stat.count} days
                </span>
                <span className="statsValues">
                  {stat.startDate.split("-").reverse().join(".")} -{" "}
                  {stat.isCurrent ? "present 🔥" : stat.endDate.split("-").reverse().join(".")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MONTHLY COMPARISON ACCORDION */}
        <div className="statsSection fullWidthSection">
          <h3 className="statsSectionTitle">📊 Monthly Performance by Year</h3>
          <div className="monthlyComparisonGrid">
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