import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function WeightChartSection({ weightData = [], onAddWeight }) {
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!weightInput) return;
    
    onAddWeight({
      date: dateInput,
      weight: parseFloat(weightInput.replace(",", ".")),
    });
    setWeightInput("");
  };

  // Wyliczenie min/max dla osi Y, żeby wykres był czytelny i wyśrodkowany
  const weights = weightData.map((d) => d.weight);
  const minWeight = weights.length ? Math.floor(Math.min(...weights)) - 1 : 60;
  const maxWeight = weights.length ? Math.ceil(Math.max(...weights)) + 1 : 100;

  return (
    <div className="statsSection fullWidthSection weightSection">
      <div className="weightHeader">
        <h3 className="statsSectionTitle">⚖️ Body Weight Tracker</h3>
        
        {/* Szybki formularz do wpisywania wagi */}
        <form onSubmit={handleSubmit} className="weightForm">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="weightInputDate"
          />
          <input
            type="number"
            step="0.1"
            placeholder="kg (np. 74.5)"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="weightInputNumber"
            required
          />
          <button type="submit" className="weightSubmitBtn">
            Add
          </button>
        </form>
      </div>

      <div style={{ width: "100%", height: 260, marginTop: "15px" }}>
        <ResponsiveContainer>
          <LineChart data={weightData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="date" stroke="#888" fontSize={12} />
            <YAxis domain={[minWeight, maxWeight]} stroke="#888" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(20, 20, 20, 0.85)",
                borderRadius: "8px",
                border: "none",
                color: "#fff",
              }}
              formatter={(value) => [`${value} kg`, "Weight"]}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: "#10b981" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default WeightChartSection;