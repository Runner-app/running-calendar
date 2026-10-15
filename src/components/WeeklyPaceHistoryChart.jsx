import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { computeRunMetrics, getWeekKey } from "../utils/RunUtils.js";

function WeeklyPaceHistoryChart({ runs = [] }) {
  const [range, setRange] = useState("3M");

  const rawChartData = useMemo(() => {
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
        const day = runDate.getDay();
        const diff = runDate.getDate() - day + (day === 0 ? -6 : 1);
        const mondayDate = new Date(runDate);
        mondayDate.setDate(diff);
        mondayDate.setHours(0, 0, 0, 0);

        weeksMap[weekKey] = {
          totalDist: 0,
          totalSeconds: 0,
          displayLabel: weekKey,
          timestamp: mondayDate.getTime(),
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

    const existingWeeks = Object.values(weeksMap).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    if (existingWeeks.length === 0) return [];

    const firstWeek = new Date(existingWeeks[0].timestamp);
    const lastWeek = new Date(
      existingWeeks[existingWeeks.length - 1].timestamp,
    );

    const allWeeks = [];
    const currentWeek = new Date(firstWeek);

    while (currentWeek <= lastWeek) {
      const timestamp = currentWeek.getTime();

      const existingWeek = existingWeeks.find(
        (week) => week.timestamp === timestamp,
      );

      if (existingWeek) {
        allWeeks.push(existingWeek);
      } else {
        allWeeks.push({
          totalDist: 0,
          totalSeconds: 0,
          displayLabel: getWeekKey(new Date(timestamp), runsWithMetrics),
          timestamp,
        });
      }

      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    return allWeeks.map((group) => {
      let paceDecimal = null;
      let paceStr = "--:--";

      if (group.totalDist > 0 && group.totalSeconds > 0) {
        const avgSecondsPerKm = group.totalSeconds / group.totalDist;

        const avgMin = Math.floor(avgSecondsPerKm / 60);
        const avgSec = Math.round(avgSecondsPerKm % 60);

        const finalMin = avgSec === 60 ? avgMin + 1 : avgMin;
        const finalSec = avgSec === 60 ? 0 : avgSec;

        paceStr = `${finalMin}:${String(finalSec).padStart(2, "0")}`;
        paceDecimal = parseFloat((finalMin + finalSec / 60).toFixed(2));
      }

      const dateObj = new Date(group.timestamp);

      const shortDate = dateObj.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      });

      return {
        weekKey: group.displayLabel,
        shortDate,
        distance: parseFloat(group.totalDist.toFixed(1)),
        paceDecimal,
        paceStr,
      };
    });
  }, [runs]);

  const filteredData = useMemo(() => {
    if (range === "3M") return rawChartData.slice(-12);
    if (range === "6M") return rawChartData.slice(-24);
    if (range === "1Y") return rawChartData.slice(-52);

    return rawChartData;
  }, [rawChartData, range]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="chartCustomTooltip">
          <p className="week">{data.weekKey}</p>

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

  if (rawChartData.length === 0) {
    return <div>No data available for the pace history chart.</div>;
  }

  return (
    <div className="glassPanel paceHistoryPanel">
      <div className="chartHeader">
        <h3>📈 Weekly Pace History</h3>

        <div className="chartRangeSelector">
          {["3M", "6M", "1Y", "ALL"].map((r) => (
            <button
              key={r}
              className={`btnRange ${range === r ? "active" : ""}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", height: "300px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={filteredData}
            margin={{ top: 20, right: 5, left: 0, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />

            <XAxis
              dataKey="shortDate"
              stroke="#727272"
              tick={{ fontSize: 11 }}
              dy={9}
            />

            {/* Lewa oś Y: tempo */}
            <YAxis
              yAxisId="pace"
              domain={["dataMin - 0.1", "dataMax + 0.1"]}
              reversed={true}
              stroke="#6d6b6b"
              tickFormatter={formatYAxis}
              tick={{ fontSize: 11 }}
            />

            {/* Prawa oś Y: dystans */}
            <YAxis
              yAxisId="distance"
              orientation="right"
              domain={[0, "auto"]}
              stroke="#727272"
              tickFormatter={(value) => `${value} km`}
              tick={{ fontSize: 11 }}
              width={50}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Słupki: tygodniowy dystans */}
            <Bar
              yAxisId="distance"
              dataKey="distance"
              fill="var(--color-primary)"
              fillOpacity={0.5}
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />

            {/* Linia: średnie tempo tygodniowe */}
            <Line
              yAxisId="pace"
              type="monotone"
              dataKey="paceDecimal"
              connectNulls={true}
              stroke="var(--color-red)"
              strokeWidth={2}
              activeDot={{
                r: 6,
                stroke: "#fff",
                strokeWidth: 1,
              }}
              dot={{
                r: 3,
                stroke: "var(--color-red)",
                strokeWidth: 2,
                fill: "#111",
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default WeeklyPaceHistoryChart;
