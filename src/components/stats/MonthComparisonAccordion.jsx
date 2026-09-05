import { useState } from "react";

function MonthComparisonAccordion({ monthData }) {
  const [isOpen, setIsOpen] = useState(false);
  const bestYear = monthData.years[0];

  return (
    <div className="monthAccordionItem">
      <div className="monthAccordionHeader" onClick={() => setIsOpen(!isOpen)}>
        <div className="monthInfo">
          <span className="monthName">{monthData.monthName}</span>
          <span className="monthBestBadge">
            👑 Record: {bestYear ? `${bestYear.distance} km (${bestYear.year})` : "No data"}
          </span>
        </div>
        <span className={`accordionArrow ${isOpen ? "open" : ""}`}>▼</span>
      </div>

      {isOpen && (
        <div className="monthAccordionContent">
          {monthData.years.map((y, idx) => (
            <div key={y.year} className={`statsItem ${y.isCurrent ? "isCurrentYear" : ""}`}>
              <span className="statsLabel">
                <span className="rankNumber">#{idx + 1}</span> {y.year}
              </span>
              <span className="statsValues">
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