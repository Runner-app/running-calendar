import { useState } from "react";

function MonthComparisonAccordion({ monthData }) {
  const [isOpen, setIsOpen] = useState(false);
  const bestYear = monthData.years[0];

  return (
    <div className="month-accordion-item">
      <div className="month-accordion-header" onClick={() => setIsOpen(!isOpen)}>
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
            <div key={y.year} className={`stats-item ${y.isCurrent ? "is-current-year" : ""}`}>
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

export default MonthComparisonAccordion;