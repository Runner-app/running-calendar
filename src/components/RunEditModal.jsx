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
  const [weatherHumidity, setWeatherHumidity] = useState("60");
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
        setMountainRun(run.mountainRun || false);
        setNotes(run.notes || "");
        if (run.weather_data) {
          setWeatherType(run.weather_data.type || "sunny");
          setWeatherTemp(String(run.weather_data.temp ?? "15"));
          setWeatherHumidity(String(run.weather_data.humidity ?? "60"));
        } else if (run.weatherType || run.weatherTemp) {
          setWeatherType(run.weatherType || "sunny");
          setWeatherTemp(String(run.weatherTemp || "15"));
          setWeatherHumidity(String(run.weatherHumidity || "60"));
        } else {
          setWeatherType("sunny");
          setWeatherTemp("15");
          setWeatherHumidity("60");
        }
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

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleProcessFitFile = (file) => {
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
          console.error("Error decoding FIT file:", error);
          alert("Failed to read .fit file. Please ensure the file is valid.");
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
          alert("Failed to find run summary in the .fit file.");
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
        if (dist > 500) dist = dist / 1000;
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
        setMountainRun(false);
        updatePaceFromDuration(finalDistance, h, m, s);
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessGpxFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      const trackpoints = xmlDoc.getElementsByTagName("trkpt");
      if (trackpoints.length === 0) {
        alert("No GPS trackpoints found in this GPX file.");
        return;
      }

      let totalDistanceKm = 0;
      let movingSeconds = 0;
      let hrSum = 0;
      let hrCount = 0;
      const cleanedRecords = [];

      let startTime = null;

      for (let i = 0; i < trackpoints.length; i++) {
        const pt = trackpoints[i];
        const lat = parseFloat(pt.getAttribute("lat"));
        const lon = parseFloat(pt.getAttribute("lon"));

        const timeNode = pt.getElementsByTagName("time")[0];
        const ptTime = timeNode ? new Date(timeNode.textContent) : null;

        if (i === 0 && ptTime) startTime = ptTime;

        let segmentDist = 0;
        let timeDiffSec = 0;

        if (i > 0) {
          const prevPt = trackpoints[i - 1];
          const prevLat = parseFloat(prevPt.getAttribute("lat"));
          const prevLon = parseFloat(prevPt.getAttribute("lon"));
          const prevTimeNode = prevPt.getElementsByTagName("time")[0];
          const prevTime = prevTimeNode ? new Date(prevTimeNode.textContent) : null;

          segmentDist = calculateDistance(prevLat, prevLon, lat, lon);
          totalDistanceKm += segmentDist;

          if (ptTime && prevTime) {
            timeDiffSec = (ptTime - prevTime) / 1000;
          }

          if (timeDiffSec > 0 && timeDiffSec < 60) {
            const speedKmH = (segmentDist / (timeDiffSec / 3600));
            if (speedKmH > 1.2) {
              movingSeconds += timeDiffSec;
            }
          }
        }

        const hrNode =
          pt.getElementsByTagName("hr")[0] ||
          pt.getElementsByTagName("gpxtpx:hr")[0];
        let pointHr = null;
        if (hrNode) {
          pointHr = parseInt(hrNode.textContent);
          hrSum += pointHr;
          hrCount++;
        }

        const elapsedSeconds =
          startTime && ptTime ? Math.round((ptTime - startTime) / 1000) : 0;

        cleanedRecords.push({
          elapsed: elapsedSeconds,
          distance: totalDistanceKm,
          hr: pointHr,
          speed: 0,
          lat: parseFloat(lat.toFixed(6)),
          lng: parseFloat(lon.toFixed(6)),
        });
      }

      setChartRecords(cleanedRecords);

      if (startTime) {
        setDate(formatDate(startTime));
        setTime(
          `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`,
        );
      }

      const finalDistance = totalDistanceKm.toFixed(2);
      setDistance(finalDistance);

      const h = Math.floor(movingSeconds / 3600);
      const m = Math.floor((movingSeconds % 3600) / 60);
      const s = Math.round(movingSeconds % 60);
      setDurationH(h);
      setDurationM(m);
      setDurationS(s);

      if (hrCount > 0) {
        setHr(Math.round(hrSum / hrCount));
      }
      setMountainRun(false);
      updatePaceFromDuration(finalDistance, h, m, s);
    };
    reader.readAsText(file);
  };

  const handleProcessTcxFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      const trackpoints = xmlDoc.getElementsByTagName("Trackpoint");
      if (trackpoints.length === 0) {
        alert("No Trackpoints found in this TCX file.");
        return;
      }

      let totalDistanceKm = 0;
      let movingSeconds = 0;
      let hrSum = 0;
      let hrCount = 0;
      const cleanedRecords = [];

      let startTime = null;

      for (let i = 0; i < trackpoints.length; i++) {
        const pt = trackpoints[i];

        const latNode = pt.getElementsByTagName("LatitudeDegrees")[0];
        const lonNode = pt.getElementsByTagName("LongitudeDegrees")[0];
        const lat = latNode ? parseFloat(latNode.textContent) : null;
        const lon = lonNode ? parseFloat(lonNode.textContent) : null;

        const timeNode = pt.getElementsByTagName("Time")[0];
        const ptTime = timeNode ? new Date(timeNode.textContent) : null;

        if (i === 0 && ptTime) startTime = ptTime;

        const distNode = pt.getElementsByTagName("DistanceMeters")[0];
        let currentDistKm = totalDistanceKm;

        if (distNode) {
          currentDistKm = parseFloat(distNode.textContent) / 1000;
        } else if (i > 0 && lat && lon) {
          const prevPt = trackpoints[i - 1];
          const prevLatNode = prevPt.getElementsByTagName("LatitudeDegrees")[0];
          const prevLonNode = prevPt.getElementsByTagName("LongitudeDegrees")[0];
          if (prevLatNode && prevLonNode) {
            currentDistKm += calculateDistance(
              parseFloat(prevLatNode.textContent),
              parseFloat(prevLonNode.textContent),
              lat,
              lon
            );
          }
        }

        if (i > 0) {
          const prevPt = trackpoints[i - 1];
          const prevTimeNode = prevPt.getElementsByTagName("Time")[0];
          const prevTime = prevTimeNode ? new Date(prevTimeNode.textContent) : null;

          const distDeltaKm = currentDistKm - totalDistanceKm;
          let timeDiffSec = 0;

          if (ptTime && prevTime) {
            timeDiffSec = (ptTime - prevTime) / 1000;
          }

          if (timeDiffSec > 0 && timeDiffSec < 60) {
            const speedKmH = distDeltaKm / (timeDiffSec / 3600);
            if (speedKmH > 1.2 || distDeltaKm > 0.002) {
              movingSeconds += timeDiffSec;
            }
          }
        }

        totalDistanceKm = currentDistKm;

        const hrNode = pt.getElementsByTagName("Value")[0];
        let pointHr = null;
        if (hrNode) {
          pointHr = parseInt(hrNode.textContent);
          hrSum += pointHr;
          hrCount++;
        }

        const elapsedSeconds =
          startTime && ptTime ? Math.round((ptTime - startTime) / 1000) : 0;

        cleanedRecords.push({
          elapsed: elapsedSeconds,
          distance: totalDistanceKm,
          hr: pointHr,
          speed: 0,
          lat: lat ? parseFloat(lat.toFixed(6)) : null,
          lng: lon ? parseFloat(lon.toFixed(6)) : null,
        });
      }

      setChartRecords(cleanedRecords);

      if (startTime) {
        setDate(formatDate(startTime));
        setTime(
          `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`,
        );
      }

      const finalDistance = totalDistanceKm.toFixed(2);
      setDistance(finalDistance);

      if (movingSeconds === 0 && startTime && trackpoints.length > 1) {
        const lastTimeNode = trackpoints[trackpoints.length - 1].getElementsByTagName("Time")[0];
        const endTime = lastTimeNode ? new Date(lastTimeNode.textContent) : null;
        if (endTime) movingSeconds = (endTime - startTime) / 1000;
      }

      const h = Math.floor(movingSeconds / 3600);
      const m = Math.floor((movingSeconds % 3600) / 60);
      const s = Math.round(movingSeconds % 60);
      setDurationH(h);
      setDurationM(m);
      setDurationS(s);

      if (hrCount > 0) {
        setHr(Math.round(hrSum / hrCount));
      }
      setMountainRun(false);
      updatePaceFromDuration(finalDistance, h, m, s);
    };
    reader.readAsText(file);
  };

  const handleFileRoute = (file) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".fit")) {
      handleProcessFitFile(file);
    } else if (fileName.endsWith(".gpx")) {
      handleProcessGpxFile(file);
    } else if (fileName.endsWith(".tcx")) {
      handleProcessTcxFile(file);
    } else {
      alert("Please upload a .fit, .gpx, or .tcx file.");
    }
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
    handleFileRoute(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileRoute(file);
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
      source: runId && existingRun ? existingRun.source : "activity_file",
      chart_records: finalChartRecords,
      weather_data: {
        type: weatherType,
        temp: parseInt(weatherTemp) || 15,
        humidity: parseInt(weatherHumidity) || 60,
      },
    };
    onSave(runData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modalOverlay active"
      onClick={onClose}
    >
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <header className="modalHeader">
          <h3 className="modalTitle">{runId ? "Edit Run" : "Add Run"}</h3>
          <button
            className="modalClose"
            aria-label="Close modal"
            onClick={onClose}
          >
            &times;
          </button>
        </header>

        <div className="modalBody">
          {!runId && (
            <div
              className={`fileDropzone center`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <span style={{ fontSize: "24px" }}>⌚</span>
              <p style={{ margin: "10px 0 5px 0", fontWeight: "bold" }}>
                Drag and drop a .fit, .gpx, or .tcx file
              </p>
              <p style={{ fontSize: "12px", color: "#aaa", margin: 0 }}>
                or click here to select it from your computer
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".fit,.gpx,.tcx"
                style={{ display: "none" }}
              />
            </div>
          )}

          <form id="formRun" onSubmit={handleSubmit}>
            <div className="formRow">
              <div className="formGroup">
                <label htmlFor="inputRunDate">Run Date</label>
                <input
                  type="date"
                  id="inputRunDate"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="formGroup">
                <label htmlFor="inputRunTime">Run Time</label>
                <input
                  type="time"
                  id="inputRunTime"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="formRow">
              <div className="formGroup">
                <label htmlFor="inputRunDistance">Distance (km)</label>
                <input
                  type="number"
                  id="inputRunDistance"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g., 10.50"
                  value={distance}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  required
                />
              </div>
              <div className="formGroup">
                <label htmlFor="inputRunHr">Average HR (bpm)</label>
                <input
                  type="number"
                  id="inputRunHr"
                  min="40"
                  max="240"
                  placeholder="e.g., 150"
                  value={hr}
                  onChange={(e) => setHr(e.target.value)}
                />
              </div>
            </div>

            <div className="formRow">
              <div className="formGroup">
                <label>Duration (hrs : mins : secs)</label>
                <div className="inlineInputGroup">
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
                  <span className="unitLabel">:</span>
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
                  <span className="unitLabel">:</span>
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
              <div className="formGroup">
                <label>Average Pace (min : sec /km)</label>
                <div className="inlineInputGroup">
                  <input
                    type="number"
                    min="1"
                    max="25"
                    placeholder="min"
                    value={paceM}
                    onChange={(e) => handlePaceFieldChange("m", e.target.value)}
                    required
                  />
                  <span className="unitLabel">:</span>
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

            <div className="formRow">
              <div className="formGroup">
                <label htmlFor="selectWeatherType">Weather</label>
                <select
                  id="selectWeatherType"
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
              <div className="formGroup">
                <label htmlFor="inputWeatherTemp">Temperature (°C)</label>
                <input
                  type="number"
                  id="inputWeatherTemp"
                  step="1"
                  placeholder="e.g., 18"
                  value={weatherTemp}
                  onChange={(e) => setWeatherTemp(e.target.value)}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="inputWeatherHumidity">Humidity (%)</label>
                <input
                  type="number"
                  id="inputWeatherHumidity"
                  min="0"
                  max="100"
                  placeholder="e.g., 60"
                  value={weatherHumidity}
                  onChange={(e) => setWeatherHumidity(e.target.value)}
                />
              </div>
            </div>

            <div className="formGroup">
              <div className="checkboxGroup">
                <input
                  type="checkbox"
                  id="checkboxMountainRun"
                  checked={mountainRun}
                  onChange={(e) => setMountainRun(e.target.checked)}
                />
                <label htmlFor="checkboxMountainRun">⛰️ Mountain Run</label>
              </div>
            </div>

            <div className="formGroup">
              <div className="inputRunNotes">Notes (optional)</div>
              <textarea
                id="inputRunNotes"
                rows="2"
                placeholder="How did today's run go?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
          </form>
        </div>

        <div className="modalFooter">
          {runId && (
            <button className="btn buttonRed" onClick={() => onDelete(runId)}>
              Delete
            </button>
          )}
          <button className="btn btnSecondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" type="submit" form="formRun">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default RunEditModal;