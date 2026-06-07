// src/App.jsx
import { useState, useEffect } from 'react';
import SidePanel from './components/SidePanel';
import CalendarView from './components/CalendarView';
import StatsPage from './components/StatsPage';
import RunEditModal from './components/RunEditModal';
import './index.less';

function App() {
  // ==========================================
  // 1. STANY KOMPONENTU (Zawsze na samym początku)
  // ==========================================
  
  // Motyw graficzny
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("running_calendar_theme") || "light";
  });

  // Ustawienia (cele tygodniowe itp.)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("running_calendar_settings");
    return saved ? JSON.parse(saved) : { weeklyGoals: {} };
  });

  // Bieżąca data w kalendarzu
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Lista biegów z localStorage
  const [runs, setRuns] = useState(() => {
    const savedRuns = localStorage.getItem('running_calendar_runs');
    return savedRuns ? JSON.parse(savedRuns) : [];
  });

  // Widoczność paneli i modali
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('calendar');
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  
  // Przechowuje ID wybranego biegu (null = nowy bieg, id = edycja)
  const [selectedRun, setSelectedRun] = useState(null);
  // Domyślna data przekazywana do modalu przy kliknięciu konkretnego dnia
  const [defaultRunDate, setDefaultRunDate] = useState(null);

  // ==========================================
  // 2. EFEKTY (useEffect)
  // ==========================================
  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
    localStorage.setItem("running_calendar_theme", theme);
  }, [theme]);

  // ==========================================
  // 3. FUNKCJE I HANDLERY
  // ==========================================
  const onToggleTheme = () => {
    setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Zapisywanie ustawień celów
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem("running_calendar_settings", JSON.stringify(newSettings));
  };

  // Import danych z pliku JSON
  const handleImportJSON = (jsonText) => {
    try {
      const parsedData = JSON.parse(jsonText);
      let runsArray = null;

      // Przypadek 1: Plik to czysta tablica biegów
      if (Array.isArray(parsedData)) {
        runsArray = parsedData;
      } 
      // Przypadek 2: Plik to cały obiekt stanu z tablicą .runs
      else if (parsedData && Array.isArray(parsedData.runs)) {
        runsArray = parsedData.runs;
        
        if (parsedData.settings && parsedData.settings.weeklyGoals) {
          setSettings(parsedData.settings);
          localStorage.setItem("running_calendar_settings", JSON.stringify(parsedData.settings));
        }
      }

      if (runsArray) {
        setRuns(runsArray);
        localStorage.setItem("running_calendar_runs", JSON.stringify(runsArray));
        alert(`Sukces! Zaimportowano pomyślnie ${runsArray.length} biegów.`);
      } else {
        alert("Błąd: Plik JSON nie zawiera prawidłowej listy biegów.");
      }
    } catch (error) {
      alert("Błąd podczas czytania pliku JSON. Upewnij się, że plik jest nieuszkodzony.");
      console.error(error);
    }
  };

  // Dodawanie / edycja pojedynczego biegu z poziomu modalu
  const handleSaveRun = (savedRun) => {
    setRuns((prevRuns) => {
      const exists = prevRuns.some(r => r.id === savedRun.id);
      let updatedRuns;
      if (exists) {
        updatedRuns = prevRuns.map(r => r.id === savedRun.id ? savedRun : r);
      } else {
        updatedRuns = [savedRun, ...prevRuns];
      }
      localStorage.setItem("running_calendar_runs", JSON.stringify(updatedRuns));
      return updatedRuns;
    });
    setIsRunModalOpen(false);
  };

  // Usuwanie biegu z poziomu modalu
  const handleDeleteRun = (runIdToDelete) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten bieg?")) {
      setRuns((prevRuns) => {
        const updatedRuns = prevRuns.filter(r => r.id !== runIdToDelete);
        localStorage.setItem("running_calendar_runs", JSON.stringify(updatedRuns));
        return updatedRuns;
      });
      setIsRunModalOpen(false);
    }
  };

  const handleAddRunClick = (runId = null, dateStr = null) => {
    setSelectedRun(runId);
    setDefaultRunDate(dateStr);
    setIsRunModalOpen(true);
  };

  return (
    <>
      <div className={`app-container ${isSidebarOpen ? '' : 'sidebar-hidden'}`}>
        <SidePanel 
          onAddRunClick={() => handleAddRunClick(null, null)}
          onStatsClick={() => setActiveView('stats')}
          onCalendarClick={() => setActiveView('calendar')}
          onImportJSON={handleImportJSON}
          runs={runs}
        />

        <main className="calendar-panel glass-panel" style={{ display: activeView === 'calendar' ? 'block' : 'none' }}>
          <CalendarView 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate}
            onToggleSidebar={toggleSidebar}
            runs={runs}
            theme={theme}
            onToggleTheme={onToggleTheme}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onAddRunClick={handleAddRunClick}
          />
        </main>

        {activeView === 'stats' && (
          <StatsPage 
            runs={runs} 
            onBackClick={() => setActiveView('calendar')}
          />
        )}
      </div>

      <RunEditModal 
        isOpen={isRunModalOpen}
        runId={selectedRun}
        defaultDate={defaultRunDate}
        runs={runs}
        onClose={() => setIsRunModalOpen(false)}
        onSave={handleSaveRun}
        onDelete={handleDeleteRun}
      />
    </>
  );
}

export default App;