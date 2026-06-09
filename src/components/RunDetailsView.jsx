import {
  ResponsiveContainer,
  ComposedChart, // Zmieniamy AreaChart na ComposedChart, żeby łączyć typy
  Area,
  Line, // Dorzucamy linię dla tempa
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
// NOWE IMPORTY DLA MAPY:
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import L from "leaflet";

// Rozwiązanie problemu ze ścieżkami do domyślnych ikon Leafleta w środowiskach bundlerów (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function RunDetailsView({ run, onBackClick, onEditClick }) {
  if (!run) return null;

  // 1. Przygotowanie danych do wykresu oraz wyciąganie punktów GPS
  const formatChartData = () => {
    if (!run.chart_records || !Array.isArray(run.chart_records)) {
      return { chartData: [], gpsCoords: [] };
    }

    const gpsCoords = [];

    const chartData = run.chart_records.map((record, index) => {
      let paceStr = "-";
      // Parser podaje prędkość w km/h
      const speedKmH = record.speed || 0;

      // Zmienna do rysowania wykresu (szukamy km/h, żeby górki na wykresie to była prędkość)
      let speedForChart = 0;

      // Sensowna prędkość biegowa (odcinamy marsz i błędy GPS)
      if (speedKmH > 3 && speedKmH < 35) {
        speedForChart = parseFloat(speedKmH.toFixed(1));
        const paceDecimal = 60 / speedKmH;
        const mins = Math.floor(paceDecimal);
        const secs = Math.floor((paceDecimal - mins) * 60);
        paceStr = `${mins}:${String(secs).padStart(2, "0")}`;
      }

      // Jeśli w rekordzie są współrzędne, zapisujemy je jako tablicę [lat, lng] dla Leafleta
      if (record.lat && record.lng) {
        gpsCoords.push([record.lat, record.lng]);
      }

      // Formatowanie czasu osi X (indeks sekundy na MM:SS)
      const totalSecs = index;
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      const timeLabel =
        h > 0
          ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

      return {
        name: timeLabel,
        "Tętno (bpm)": record.hr || 0,
        distance: (record.distance || 0).toFixed(2),
        tempoStr: paceStr, // Do tooltipa
        speedKmH: speedForChart, // Do rysowania wykresu
      };
    });

    console.log("Surowy pierwszy rekord:", run.chart_records?.[0]);
    return { chartData, gpsCoords };
  };

  const { chartData, gpsCoords } = formatChartData();

  // Dynamiczne obliczanie środka mapy (średnia ze wszystkich punktów trasy)
  const getMapCenter = () => {
    if (gpsCoords.length === 0) return [52.237, 21.017]; // Domyślnie Warszawa
    const latSum = gpsCoords.reduce((sum, coord) => sum + coord[0], 0);
    const lngSum = gpsCoords.reduce((sum, coord) => sum + coord[1], 0);
    return [latSum / gpsCoords.length, lngSum / gpsCoords.length];
  };

  const mapCenter = getMapCenter();

  // Własny styl Tooltipa (teraz pokazuje oba parametry)
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const hrPayload = payload.find((p) => p.dataKey === "Tętno (bpm)");
      const speedPayload = payload.find((p) => p.dataKey === "speedKmH");

      return (
        <div
          style={{
            background: "#222",
            border: "1px solid #444",
            padding: "12px",
            borderRadius: "8px",
            color: "#fff",
            boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px 0",
              fontWeight: "bold",
              textAlign: "center",
              borderBottom: "1px solid #444",
              paddingBottom: "5px",
            }}
          >
            Czas: {hrPayload?.payload.name}
          </p>
          {hrPayload && (
            <p
              style={{
                margin: "0",
                color: "#ff5252",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              ❤️ Tętno: {hrPayload.value} bpm
            </p>
          )}
          {speedPayload && (
            <>
              <p
                style={{
                  margin: "5px 0 0 0",
                  color: "#00e5ff",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                🏃‍♂️ Tempo: {speedPayload.payload.tempoStr} /km
              </p>
              <p
                style={{ margin: "2px 0 0 0", color: "#666", fontSize: "11px" }}
              >
                ({speedPayload.value} km/h)
              </p>
            </>
          )}
          <p
            style={{
              margin: "8px 0 0 0",
              color: "#aaa",
              fontSize: "12px",
              textAlign: "right",
            }}
          >
            📍 Dystans: {hrPayload?.payload.distance} km
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="run-details-container"
      style={{
        padding: "20px",
        color: "#fff",
        background: "rgba(30,30,30,0.8)",
        borderRadius: "12px",
        backdropFilter: "blur(10px)",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <button onClick={onBackClick} className="btn btn-secondary">
          ⬅️ Powrót
        </button>
        <button onClick={onEditClick} className="btn">
          ⚙️ Opcje
        </button>
      </div>

      <header style={{ marginBottom: "30px" }}>
        <h2 style={{ margin: 0, fontSize: "28px" }}>Podsumowanie Biegu 🏃‍♂️</h2>
        <p style={{ color: "#aaa", margin: "5px 0 0 0" }}>
          {run.date} o godzinie {run.time}{" "}
          {run.source === "fit_file" ? "• ⌚ Zaimportowano z FIT" : ""}
        </p>
      </header>

      {/* Karty statystyk */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        {[
          { label: "DYSTANS", value: `${run.distance} km`, color: "#00c853" },
          {
            label: "CZAS TRWANIA",
            value: `${run.durationH > 0 ? `${run.durationH}h ` : ""}${run.durationM}m ${run.durationS}s`,
            color: "#fff",
          },
          {
            label: "ŚREDNIE TEMPO",
            value: `${run.paceM}:${String(run.paceS).padStart(2, "0")} /km`,
            color: "#00e5ff",
          },
          {
            label: "ŚREDNIE TĘTNO",
            value: run.hr ? `${run.hr} bpm` : "--",
            color: "#ff5252",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#222",
              padding: "20px",
              borderRadius: "10px",
              textAlign: "center",
              boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "#888",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              {stat.label}
            </span>
            <h3
              style={{
                margin: "8px 0 0 0",
                fontSize: "26px",
                color: stat.color,
                fontWeight: "bold",
              }}
            >
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      {/* SEKCJA ANALITYCZNA (DWUKOLUMNOWY GRID DLA MAPY I WYKRESU) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gpsCoords.length > 0 ? "1fr 1fr" : "1fr",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        {/* LEWA KOLUMNA: MAPA (Renderuje się tylko gdy mamy punkty GPS) */}
        {gpsCoords.length > 0 && (
          <div
            style={{
              background: "#222",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
              height: "400px",
            }}
          >
            <h4 style={{ margin: "0 0 15px 0", color: "#aaa" }}>
              Trasa biegu 🗺️
            </h4>
            <div
              style={{
                width: "100%",
                height: "calc(100% - 35px)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ width: "100%", height: "100%" }}
              >
                {/* Ciemne kafelki dopasowane do klimatu aplikacji */}
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                {/* Ścieżka biegu jako linia neonowo-błękitna */}
                <Polyline
                  positions={gpsCoords}
                  color="#00e5ff"
                  weight={4}
                  opacity={0.8}
                />
              </MapContainer>
            </div>
          </div>
        )}

        {/* PRAWA KOLUMNA: WYKRES */}
        {chartData.length > 0 ? (
          <div
            style={{
              background: "#222",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
              height: "400px",
            }}
          >
            <h4 style={{ margin: "0 0 15px 0", color: "#aaa" }}>
              Analiza telemetryczna 📈
            </h4>
            <div style={{ width: "100%", height: "calc(100% - 35px)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff5252" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ff5252" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#333"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#666"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    minTickGap={60}
                  />

                  {/* Oś Y lewa (Tętno) */}
                  <YAxis
                    yAxisId="left"
                    domain={["dataMin - 10", "dataMax + 5"]}
                    stroke="#ff5252"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  {/* Oś Y prawa (Prędkość) */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[3, "dataMax + 2"]}
                    stroke="#00e5ff"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "#666",
                      strokeWidth: 1,
                      strokeDasharray: "6 6",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }}
                  />

                  {/* 1. Tętno jako wypełniony obszar (Area) */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="Tętno (bpm)"
                    stroke="#ff5252"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHr)"
                  />

                  {/* 2. Prędkość jako linia (Line) */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="speedKmH"
                    name="Prędkość (km/h)"
                    stroke="#00e5ff"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#222",
              padding: "30px",
              borderRadius: "10px",
              textAlign: "center",
              color: "#aaa",
              fontStyle: "italic",
            }}
          >
            Brak szczegółowych danych telemetrycznych dla tego biegu.
          </div>
        )}
      </div>

      {run.notes && (
        <div
          style={{
            background: "#222",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          }}
        >
          <h4
            style={{
              margin: "0 0 12px 0",
              color: "#aaa",
              borderBottom: "1px solid #333",
              paddingBottom: "8px",
            }}
          >
            Notatki z treningu
          </h4>
          <p
            style={{
              margin: 0,
              lineHeight: "1.7",
              color: "#ddd",
              fontStyle: "italic",
            }}
          >
            {run.notes}
          </p>
        </div>
      )}
    </div>
  );
}

export default RunDetailsView;
