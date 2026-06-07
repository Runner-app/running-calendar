import React from 'react';
import { computeRunMetrics } from '../utils/RunUtils.js';

function SidePanel({ onAddRunClick, onStatsClick, onImportJSON, runs }) {
  
  // 1. Przetwarzamy tablicę biegów przez funkcję pomocniczą, aby uzyskać wyliczone metryki (streak, numerację itp.)
  const runsWithMetrics = computeRunMetrics(runs || []);

  // 2. OBLICZENIA DYNAMICZNYCH STATYSTYK
  
  // Łączna liczba biegów
  const totalRuns = runsWithMetrics.length;

  // Łączny dystans (sumujemy pole distance dla każdego obiektu)
  const totalDistance = runsWithMetrics.reduce((sum, run) => sum + (parseFloat(run.distance) || 0), 0);

  // Aktualna passa (Day streak) - wyciągamy computedStreak z chronologicznie najnowszego treningu
  let currentStreak = 0;
  if (runsWithMetrics.length > 0) {
    const sortedRuns = [...runsWithMetrics].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateB - dateA; // Sortowanie od najnowszego do najstarszego
    });
    currentStreak = sortedRuns[0].computedStreak || 0;
  }

  // Funkcja, która odpala się, gdy użytkownik wybierze plik z dysku
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      onImportJSON(text); // Przekazujemy odczytany tekst JSON do App.jsx
    };
    reader.readAsText(file);
    event.target.value = ""; // Resetujemy input, aby można było ponownie załadować ten sam plik
  };

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <span className="brand-icon">🏃</span>
        <h1 className="brand-logo">Running Calendar</h1>
      </div>

      <button className="btn btn-full" onClick={onAddRunClick}>
        Add Run
      </button>

      <div className="glass-panel">
        <div className="stats-header">
          <span>📊 My Stats</span>
        </div>
        <div className="stats-grid">
          
          <div className="stat-card">
            <div className="stat-icon">🏁</div>
            <div className="stat-info">
              <span className="stat-label">Total Runs</span>
              <span className="stat-value">{totalRuns}</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🗺️</div>
            <div className="stat-info">
              <span className="stat-label">Total Distance</span>
              <span className="stat-value">{Math.floor(totalDistance).toLocaleString('pl-PL')} km</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-info">
              <span className="stat-label">Day streak</span>
              <span className="stat-value">
                {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

        </div>
      </div>
      
      <button className="btn btn-secondary btn-full" id="btn-stats-sidebar" onClick={onStatsClick}>
        <span>📈</span> Statistics
      </button>

      <input 
        type="file" 
        id="json-upload-input" 
        accept=".json" 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />
      
      <button className="btn btn-secondary btn-full" onClick={() => document.getElementById('json-upload-input').click()}>
        <span>📥</span> Import JSON Data
      </button>
    </aside>
  );
}

export default SidePanel;