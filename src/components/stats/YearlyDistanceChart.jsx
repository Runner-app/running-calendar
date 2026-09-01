import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Rectangle, // <--- Dodajemy Rectangle z Recharts
} from "recharts";

function YearlyDistanceChart({ data }) {
  const currentYear = new Date().getFullYear();

  const chartData = [...data].reverse().map((item) => ({
    year: item.year.toString(),
    distance: Math.round(item.totalDistance),
    runs: item.totalRuns,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            padding: "8px 12px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ color: "#f8fafc", fontWeight: "bold", marginBottom: "4px" }}>
            {item.year}
          </div>
          <div style={{ color: "var(--color-primary)", fontSize: "0.9rem" }}>
            <strong>{item.distance}</strong> km
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
            {item.runs} {item.runs === 1 ? "run" : "runs"}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: 270, marginTop: "25px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 15, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="year"
            stroke="#64748b"
            fontSize={12}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            unit=" km"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          
          {/* Używamy propa shape zamiast podrzędnych <Cell /> */}
          <Bar
            dataKey="distance"
            shape={(props) => {
              const isCurrentYear = Number(props.payload?.year) === currentYear;
              return (
                <Rectangle
                  {...props}
                  fill={isCurrentYear ? "#ef4444" : "var(--color-primary)"}
                  fillOpacity={isCurrentYear ? 0.9 : 0.7}
                  radius={[6, 6, 0, 0]}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default YearlyDistanceChart;