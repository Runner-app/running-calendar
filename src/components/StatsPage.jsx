import { useMemo } from "react";
import { computeRunMetrics } from "../utils/RunUtils.js";

function StatsPage({ runs, onBackClick, onToggleSidebar, isSidebarOpen }) {
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

    return Object.values(yearlyMap).sort((a, b) => b.year - a.year);
  }, [runsWithMetrics]);

  const monthlyStats = useMemo(() => {
    const monthlyMap = {};

    runsWithMetrics.forEach((run) => {
      const date = new Date(run.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthName = monthNames[month];
      const key = `${year}-${month}`;
      const distance = parseFloat(run.distance) || 0;

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          year,
          month,
          monthName,
          key,
          totalDistance: 0,
          runCount: 0,
        };
      }
      monthlyMap[key].totalDistance += distance;
      monthlyMap[key].runCount += 1;
    });

    return Object.values(monthlyMap).sort(
      (a, b) => b.totalDistance - a.totalDistance,
    );
  }, [runsWithMetrics]);

  return (
    <div className="stats-page glass-panel" id="stats-page">
      <header className="stats-header">
        <button
          className="nav-btn"
          id="btn-back-stats"
          aria-label="Back to calendar"
          onClick={onBackClick}
        >
          ◀
        </button>
        <h2 className="stats-title">Statistics</h2>
        <button
          className="btn btn-secondary"
          onClick={onToggleSidebar}
          title="Show/Hide sidebar"
        >
          <span>📊</span> {isSidebarOpen ? "Hide" : "Show"} Panel
        </button>
      </header>

      <div className="stats-content">
        <div className="stats-section">
          <h3 className="stats-section-title">📅 Yearly Breakdown</h3>
          <div id="yearly-stats-container">
            {yearlyStats.length === 0 ? (
              <div className="stats-empty">No data available</div>
            ) : (
              yearlyStats.map((stat) => (
                <div className="stats-item" key={stat.year}>
                  <span className="stats-label">{stat.year}</span>
                  <span className="stats-values">
                    {Math.round(stat.totalDistance)} km • {stat.totalRuns} runs
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="stats-section">
          <h3 className="stats-section-title">
            🏆 Monthly Rankings (By Distance)
          </h3>
          <div id="monthly-stats-container">
            {monthlyStats.length === 0 ? (
              <div className="stats-empty">No data available</div>
            ) : (
              monthlyStats.map((stat) => (
                <div className="stats-item" key={stat.key}>
                  <span className="stats-label">
                    {stat.monthName} {stat.year}
                  </span>
                  <span className="stats-values">
                    {Math.round(stat.totalDistance)}.0 km • {stat.runCount} runs
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsPage;
