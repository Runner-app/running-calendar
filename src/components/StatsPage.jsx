import { useMemo } from "react";
import { computeRunMetrics } from "../utils/RunUtils.js";
import WeeklyPaceHistoryChart from "./WeeklyPaceHistoryChart";

function StatsPage({ runs, onBackClick }) {
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
      (a, b) => b.totalDistance - a.totalDistance,
    );
  }, [runsWithMetrics]);

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
      (a, b) => b.totalDistance - a.totalDistance,
    );
  }, [runsWithMetrics]);

  return (
    <div className="stats-page glass-panel" id="stats-page">
      <header className="stats-header">
        <button
          className="btn btn-secondary nav-btn"
          id="btn-back-stats"
          aria-label="Back to calendar"
          onClick={onBackClick}
        >
          <span>&lt;</span>
        </button>
        <h2 className="stats-title">Statistics</h2>
      </header>

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
                    className={`stats-item ${isCurrentYear ? "is-current-year" : ""}`}
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
                    className={`stats-item ${isCurrentMonth ? "is-current-month" : ""}`}
                    key={stat.key}
                  >
                    <span className="stats-label">
                      {stat.monthName} {stat.year}
                    </span>
                    <span className="stats-values">
                      {Math.round(stat.totalDistance)}.0 km • {stat.runCount}{" "}
                      {`${stat.runCount == 1 ? "run" : "runs"}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <WeeklyPaceHistoryChart runs={runs} />
    </div>
  );
}

export default StatsPage;
