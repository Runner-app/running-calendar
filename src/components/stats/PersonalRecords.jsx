import { useMemo } from "react";
import { getPersonalRecords } from "../../utils/personalRecords.js";

function formatDuration(totalSeconds) {
  const seconds = Math.round(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, "0"),
      String(remainingSeconds).padStart(2, "0"),
    ].join(":");
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatPace(secondsPerKm) {
  const totalSeconds = Math.round(secondsPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
}

function PersonalRecords({ runs = [] }) {
  const records = useMemo(() => getPersonalRecords(runs), [runs]);

  return (
    <div className="statsSection personalRecordsSection">
      <h3 className="statsSectionTitle">🏆 Personal Records</h3>

      <div className="personalRecords">
        {records.map(({ id, label, record }) => (
          <div
            className={`personalRecordCard ${
              record ? "hasRecord" : "noRecord"
            }`}
            key={id}
          >
            <div className="personalRecordHeader">
              <span className="personalRecordDistance">{label}</span>
            </div>

            {record ? (
              <>
                <div className="personalRecordTime">
                  {formatDuration(record.duration)}
                </div>

                <div className="personalRecordDetails">
                  <span>
                    {record.formattedDate}
                    <br></br>
                  </span>
                  <span>{formatPace(record.paceSecondsPerKm)}</span>
                </div>
              </>
            ) : (
              <div className="personalRecordEmpty">
                <span>No qualifying run yet</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PersonalRecords;
