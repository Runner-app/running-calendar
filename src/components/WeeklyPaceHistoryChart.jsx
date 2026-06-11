import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { computeRunMetrics, getWeekKey } from "../utils/RunUtils.js";

function WeeklyPaceHistoryChart({ runs = [] }) {
  const chartData = useMemo(() => {
    if (!runs || runs.length === 0) return [];

    const runsWithMetrics = computeRunMetrics([...runs]).sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    const weeksMap = {};

    runsWithMetrics.forEach((run) => {
      if (!run.date) return;
      const runDate = new Date(run.date);

      const weekKey = getWeekKey(runDate, runsWithMetrics);

      if (!weeksMap[weekKey]) {
        weeksMap[weekKey] = {
          totalDist: 0,
          totalSeconds: 0,
          displayLabel: weekKey,
        };
      }

      const dist = parseFloat(run.distance) || 0;
      weeksMap[weekKey].totalDist += dist;

      const h = parseInt(run.durationH) || 0;
      const m = parseInt(run.durationM) || 0;
      const s = parseInt(run.durationS) || 0;
      const durationSeconds = h * 3600 + m * 60 + s;

      if (durationSeconds > 0) {
        weeksMap[weekKey].totalSeconds += durationSeconds;
      } else {
        const paceSec =
          (parseInt(run.paceM) || 0) * 60 + (parseInt(run.paceS) || 0);
        weeksMap[weekKey].totalSeconds += paceSec * dist;
      }
    });

    return Object.keys(weeksMap)
      .sort()
      .map((key) => {
        const group = weeksMap[key];
        let paceDecimal = 0;
        let paceStr = "--:--";

        if (group.totalDist > 0 && group.totalSeconds > 0) {
          const avgSecondsPerKm = group.totalSeconds / group.totalDist;
          const avgMin = Math.floor(avgSecondsPerKm / 60);
          const avgSec = Math.round(avgSecondsPerKm % 60);

          const finalMin = avgSec === 60 ? avgMin + 1 : avgMin;
          const finalSec = avgSec === 60 ? 0 : avgSec;

          const avgSecStr = String(finalSec).padStart(2, "0");
          paceStr = `${finalMin}:${avgSecStr}`;

          paceDecimal = finalMin + finalSec / 60;
        }

        return {
          weekKey: group.displayLabel,
          distance: parseFloat(group.totalDist.toFixed(1)),
          paceDecimal:
            paceDecimal > 0 ? parseFloat(paceDecimal.toFixed(2)) : null,
          paceStr: paceStr,
        };
      })
      .filter((item) => item.paceDecimal !== null);
  }, [runs]);

  const dynamicWidth = useMemo(() => {
    const minWidth = window.innerWidth - 60;
    const calculatedWidth = chartData.length * 65;
    return Math.max(minWidth, calculatedWidth);
  }, [chartData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-custom-tooltip">
          <p className="week">Week: {data.weekKey}</p>
          <p className="pace">
            Pace: <strong>{data.paceStr} min/km</strong>
          </p>
          <p className="distance">📈 Distance: {data.distance} km</p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (tickItem) => {
    const mins = Math.floor(tickItem);
    const secs = Math.round((tickItem % 1) * 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  if (chartData.length === 0) {
    return <div>No data available for the pace history chart.</div>;
  }

  return (
    <div className="glass-panel pace-history-panel">
      <h3 className="center">📈 Weekly Pace History</h3>

      <div className="weekly-history-scroll-container">
        <div style={{ width: `${dynamicWidth}px`, height: "350px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="weekKey"
                stroke="#727272"
                tick={{ fontSize: 11 }}
                dy={10}
              />
              <YAxis
                domain={["dataMin - 0.2", "dataMax + 0.2"]}
                reversed={true}
                stroke="#6d6b6b"
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="paceDecimal"
                stroke="#00c853"
                strokeWidth={3}
                activeDot={{ r: 6, stroke: "#fff", strokeWidth: 1 }}
                dot={{ r: 3, stroke: "#00c853", strokeWidth: 2, fill: "#111" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default WeeklyPaceHistoryChart;
