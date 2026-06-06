import { state } from './state.js';
import { computeRunMetrics } from './utils.js';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function generateYearlyStats() {
  const runsWithMetrics = computeRunMetrics();
  const yearlyMap = {};

  runsWithMetrics.forEach(run => {
    const year = new Date(run.date).getFullYear();
    const distance = parseFloat(run.distance) || 0;

    if (!yearlyMap[year]) {
      yearlyMap[year] = { year, totalDistance: 0, totalRuns: 0 };
    }
    yearlyMap[year].totalDistance += distance;
    yearlyMap[year].totalRuns += 1;
  });

  return Object.values(yearlyMap).sort((a, b) => b.year - a.year);
}

export function generateMonthlyRankings() {
  const runsWithMetrics = computeRunMetrics();
  const monthlyMap = {};

  runsWithMetrics.forEach(run => {
    const date = new Date(run.date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthName = monthNames[month];
    const key = `${year}-${month}`;
    const distance = parseFloat(run.distance) || 0;

    if (!monthlyMap[key]) {
      monthlyMap[key] = { year, month, monthName, key, totalDistance: 0, runCount: 0 };
    }
    monthlyMap[key].totalDistance += distance;
    monthlyMap[key].runCount += 1;
  });

  return Object.values(monthlyMap).sort((a, b) => b.totalDistance - a.totalDistance);
}

export function renderStatsPage() {
  const yearlyContainer = document.getElementById('yearly-stats-container');
  const monthlyContainer = document.getElementById('monthly-stats-container');

  if (!yearlyContainer || !monthlyContainer) return;

  const yearlyStats = generateYearlyStats();
  const monthlyStats = generateMonthlyRankings();

  // Render yearly stats
  if (yearlyStats.length === 0) {
    yearlyContainer.innerHTML = '<div class="stats-empty">No data available</div>';
  } else {
    yearlyContainer.innerHTML = yearlyStats.map(stat => `
      <div class="stats-item">
        <span class="stats-label">${stat.year}</span>
        <span class="stats-values">${stat.totalDistance.toFixed(1)} km • ${stat.totalRuns} runs</span>
      </div>
    `).join('');
  }

  // Render monthly stats
  if (monthlyStats.length === 0) {
    monthlyContainer.innerHTML = '<div class="stats-empty">No data available</div>';
  } else {
    monthlyContainer.innerHTML = monthlyStats.map((stat, index) => `
      <div class="stats-item">
        <span class="stats-label">${stat.monthName} ${stat.year}</span>
        <span class="stats-values">${stat.totalDistance.toFixed(1)} km • ${stat.runCount} runs</span>
      </div>
    `).join('');
  }
}
