import { useState, useEffect, useRef } from "react";
import { formatDate } from "../utils/RunUtils.js";
import FitParser from "fit-file-parser";

function RunEditModal({
  isOpen,
  runId,
  defaultDate,
  runs,
  onClose,
  onSave,
  onDelete,
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [distance, setDistance] = useState("");
  const [hr, setHr] = useState("");
  const [durationH, setDurationH] = useState(0);
  const [durationM, setDurationM] = useState(0);
  const [durationS, setDurationS] = useState(0);
  const [paceM, setPaceM] = useState("");
  const [paceS, setPaceS] = useState("");
  const [weatherType, setWeatherType] = useState("sunny");
  const [weatherTemp, setWeatherTemp] = useState("15");
  const [mountainRun, setMountainRun] = useState(false);
  const [notes, setNotes] = useState("");
  const [chartRecords, setChartRecords] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [lastEditedGroup, setLastEditedGroup] = useState("pace");

  useEffect(() => {
    if (!isOpen) return;

    if (runId) {
      const run = runs.find((r) => r.id === runId);
      if (run) {
        setDate(run.date || "");
        setTime(run.time || "08:00");
        setDistance(run.distance || "");
        setHr(run.hr || "");
        setDurationH(run.durationH || 0);
        setDurationM(run.durationM || 0);
        setDurationS(run.durationS || 0);
        setPaceM(run.paceM || "");
        setPaceS(run.paceS || "");
        setWeatherType(run.weatherType || "sunny");
        setWeatherTemp(run.weatherTemp || "15");
        setMountainRun(run.mountainRun || false);
        setNotes(run.notes || "");
      }
    } else {
      setDate(defaultDate || formatDate(new Date()));
      const now = new Date();
      setTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      );
      setDistance("");
      setHr("");
      setDurationH(0);
      setDurationM(0);
      setDurationS(0);
      setPaceM("");
      setPaceS("");
      setWeatherType("sunny");
      setWeatherTemp("15");
      setMountainRun(false);
      setNotes("");
      setChartRecords(null);
    }
  }, [isOpen, runId, defaultDate, runs]);

  const updatePaceFromDuration = (currentDist, h, m, s) => {
    const dist = parseFloat(currentDist);
    if (!dist || dist <= 0) return;
    const totalSeconds = h * 3600 + m * 60 + s;
    if (totalSeconds <= 0) return;

    const secondsPerKm = totalSeconds / dist;
    const pMin = Math.floor(secondsPerKm / 60);
    const pSec = Math.round(secondsPerKm % 60);

    setPaceM(pMin);
    setPaceS(pSec === 60 ? 59 : pSec);
  };

  const updateDurationFromPace = (currentDist, pm, ps) => {
    const dist = parseFloat(currentDist);
    if (!dist || dist <= 0) return;
    const paceSecondsPerKm = pm * 60 + ps;
    if (paceSecondsPerKm <= 0) return;

    const totalSeconds = paceSecondsPerKm * dist;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.round(totalSeconds % 60);

    setDurationH(h);
    setDurationM(m);
    setDurationS(s === 60 ? 59 : s);
  };

  const handleDistanceChange = (val) => {
    setDistance(val);
    if (lastEditedGroup === "duration") {
      updatePaceFromDuration(val, durationH, durationM, durationS);
    } else {
      updateDurationFromPace(val, parseInt(paceM) || 0, parseInt(paceS) || 0);
    }
  };

  const handleDurationFieldChange = (type, val) => {
    const num = parseInt(val) || 0;
    let h = durationH,
      m = durationM,
      s = durationS;
    if (type === "h") {
      setDurationH(num);
      h = num;
    }
    if (type === "m") {
      setDurationM(num);
      m = num;
    }
    if (type === "s") {
      setDurationS(num);
      s = num;
    }

    setLastEditedGroup("duration");
    updatePaceFromDuration(distance, h, m, s);
  };

  const handlePaceFieldChange = (type, val) => {
    const num = parseInt(val) || 0;
    let pm = paceM,
      ps = paceS;
    if (type === "m") {
      setPaceM(val === "" ? "" : num);
      pm = num;
    }
    if (type === "s") {
      setPaceS(val === "" ? "" : num);
      ps = num;
    }

    setLastEditedGroup("pace");
    updateDurationFromPace(distance, pm, ps);
  };

  const handleProcessFitFile = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;

      const fitParser = new FitParser({
        force: true,
        speedUnit: "km/h",
        lengthUnit: "km",
        temperatureUnit: "celsius",
      });

      fitParser.parse(arrayBuffer, (error, data) => {
        if (error) {
          console.error("Błąd dekodowania pliku FIT:", error);
          alert(
            "Nie udało się odczytać pliku .fit. Upewnij się, że plik jest poprawny.",
          );
          return;
        }

        const session = data.sessions?.[0] || data.activity?.sessions?.[0];
        const records = data.records || [];

        const cleanedRecords = records.map((r) => {
          const semicirclesToDegrees = (val) =>
            val ? val * (180 / Math.pow(2, 31)) : null;

          let lat = r.position_lat || null;
          let lng = r.position_long || null;

          if (lat && Math.abs(lat) > 180) lat = semicirclesToDegrees(lat);
          if (lng && Math.abs(lng) > 180) lng = semicirclesToDegrees(lng);

          return {
            elapsed: r.elapsed_time || 0,
            distance: r.distance || 0,
            hr: r.heart_rate || null,
            speed: r.speed || 0,
            lat: lat ? parseFloat(lat.toFixed(6)) : null,
            lng: lng ? parseFloat(lng.toFixed(6)) : null,
          };
        });

        setChartRecords(cleanedRecords);

        if (!session) {
          alert("Nie znaleziono podsumowania treningu w pliku .fit.");
          return;
        }

        if (session.start_time) {
          const startTime = new Date(session.start_time);
          setDate(formatDate(startTime));
          setTime(
            `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`,
          );
        }

        let dist = session.total_distance;
        if (dist > 500) {
          dist = dist / 1000;
        }
        const finalDistance = parseFloat(dist).toFixed(2);
        setDistance(finalDistance);

        const totalSeconds = Math.round(
          session.total_timer_time || session.total_elapsed_time || 0,
        );
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        setDurationH(h);
        setDurationM(m);
        setDurationS(s);

        if (session.avg_heart_rate) {
          setHr(Math.round(session.avg_heart_rate));
        }

        updatePaceFromDuration(finalDistance, h, m, s);

        setNotes((prev) => (prev ? prev : ""));
      });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".fit")) {
      handleProcessFitFile(file);
    } else {
      alert("Proszę upuścić plik z rozszerzeniem .fit");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleProcessFitFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const existingRun = runId ? runs.find((r) => r.id === runId) : null;
    const finalChartRecords =
      chartRecords || (existingRun ? existingRun.chart_records : null);

    const runData = {
      id:
        runId || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date,
      time,
      distance: parseFloat(distance),
      hr: hr ? parseInt(hr) : null,
      durationH: parseInt(durationH) || 0,
      durationM: parseInt(durationM) || 0,
      durationS: parseInt(durationS) || 0,
      paceM: parseInt(paceM) || 0,
      paceS: parseInt(paceS) || 0,
      weatherType,
      weatherTemp: parseInt(weatherTemp) || 15,
      mountainRun,
      notes,
      source: runId && existingRun ? existingRun.source : "fit_file", // zachowujemy oryginalne źródło
      chart_records: finalChartRecords, // <--- Przekazujemy uratowaną telemetrię!
    };
    onSave(runData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay active"
      id="modal-run-overlay"
      onClick={onClose}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3 className="modal-title">{runId ? "Edit Run" : "Add Run"}</h3>
          <button
            className="modal-close"
            aria-label="Close modal"
            onClick={onClose}
          >
            &times;
          </button>
        </header>

        <div className="modal-body">
          {!runId && (
            <div
              className={`fit-dropzone ${isDragging ? "dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              style={{
                border: "2px dashed #00c853",
                borderRadius: "8px",
                padding: "20px",
                textAlign: "center",
                marginBottom: "20px",
                background: isDragging
                  ? "rgba(0, 200, 83, 0.1)"
                  : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: "24px" }}>⌚</span>
              <p style={{ margin: "10px 0 5px 0", fontWeight: "bold" }}>
                Przeciągnij i upuść plik .fit ze Stravy
              </p>
              <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
                lub kliknij tutaj, aby wybrać go z komputera
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".fit"
                style={{ display: "none" }}
              />
            </div>
          )}

          <form id="form-run" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="input-run-date">Run Date</label>
                <input
                  type="date"
                  id="input-run-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="input-run-time">Run Time</label>
                <input
                  type="time"
                  id="input-run-time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="input-run-distance">Distance (km)</label>
                <input
                  type="number"
                  id="input-run-distance"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g., 10.50"
                  value={distance}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="input-run-hr">Average HR (bpm)</label>
                <input
                  type="number"
                  id="input-run-hr"
                  min="40"
                  max="240"
                  placeholder="e.g., 150"
                  value={hr}
                  onChange={(e) => setHr(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duration (hrs : mins : secs)</label>
                <div className="inline-input-group">
                  <input
                    type="number"
                    min="0"
                    max="99"
                    placeholder="g"
                    value={durationH}
                    onChange={(e) =>
                      handleDurationFieldChange("h", e.target.value)
                    }
                  />
                  <span className="unit-label">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="m"
                    value={durationM}
                    onChange={(e) =>
                      handleDurationFieldChange("m", e.target.value)
                    }
                  />
                  <span className="unit-label">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="s"
                    value={durationS}
                    onChange={(e) =>
                      handleDurationFieldChange("s", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Average Pace (min : sec /km)</label>
                <div className="inline-input-group">
                  <input
                    type="number"
                    min="1"
                    max="25"
                    placeholder="min"
                    value={paceM}
                    onChange={(e) => handlePaceFieldChange("m", e.target.value)}
                    required
                  />
                  <span className="unit-label">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="sek"
                    value={paceS}
                    onChange={(e) => handlePaceFieldChange("s", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="select-weather-type">Weather</label>
                <select
                  id="select-weather-type"
                  value={weatherType}
                  onChange={(e) => setWeatherType(e.target.value)}
                  required
                >
                  <option value="sunny">☀️ Sunny</option>
                  <option value="cloudy">☁️ Cloudy</option>
                  <option value="rainy">🌧️ Rainy</option>
                  <option value="snowy">❄️ Snowy</option>
                  <option value="windy">💨 Windy</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="input-weather-temp">Temperature (°C)</label>
                <input
                  type="number"
                  id="input-weather-temp"
                  step="1"
                  placeholder="e.g., 18"
                  value={weatherTemp}
                  onChange={(e) => setWeatherTemp(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="checkbox-mountain-run"
                  checked={mountainRun}
                  onChange={(e) => setMountainRun(e.target.checked)}
                />
                <label htmlFor="checkbox-mountain-run">⛰️ Mountain Run</label>
              </div>
            </div>

            <div className="form-group">
              <div className="input-run-notes">Notes (optional)</div>
              <textarea
                id="input-run-notes"
                rows="2"
                placeholder="How did today's run go?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          {runId && (
            <button className="btn btn-danger" onClick={() => onDelete(runId)}>
              Delete
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="submit" form="form-run">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default RunEditModal;
