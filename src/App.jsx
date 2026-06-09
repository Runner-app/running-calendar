import { useState, useEffect } from "react";
import { supabase } from "./config/supabaseClient";
import SidePanel from "./components/SidePanel";
import CalendarView from "./components/CalendarView";
import StatsPage from "./components/StatsPage";
import RunEditModal from "./components/RunEditModal";
import LoginScreen from "./components/LoginScreen"; // <-- NOWY IMPORT
import "./styles/index.less";

function App() {
  // Stany autentykacji
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Pozostałe stany aplikacji
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("running_calendar_theme") || "light";
  });
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("running_calendar_settings");
    return saved ? JSON.parse(saved) : { weeklyGoals: {} };
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("calendar");
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [defaultRunDate, setDefaultRunDate] = useState(null);

  // 1. SŁUCHANIE STANÓW LOGOWANIA
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Motyw
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
    localStorage.setItem("running_calendar_theme", theme);
  }, [theme]);

  const onToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // 2. POBIERANIE DANYCH Z SUPABASE
  const fetchRuns = async () => {
    if (!session?.user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("runs")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      const formattedRuns = data.map((run) => {
        const h = Math.floor(run.duration / 3600);
        const m = Math.floor((run.duration % 3600) / 60);
        const s = run.duration % 60;

        const totalMinutes = run.duration / 60;
        const rawPace = run.distance > 0 ? totalMinutes / run.distance : 0;
        const paceM = Math.floor(rawPace);
        const paceS = Math.round((rawPace - paceM) * 60);

        const cleanDate =
          run.date && typeof run.date === "string"
            ? run.date.substring(0, 10)
            : run.date;

        return {
          id: run.id,
          date: cleanDate,
          distance: run.distance,
          hr: run.avg_hr,
          durationH: h,
          durationM: m,
          durationS: s,
          paceM: paceM,
          paceS: paceS,
          notes: run.notes || "",
          source: run.source,
          time: run.time || "19:00",
          computedNumber: run.id,
          computedStreak: 1,
        };
      });

      setRuns(formattedRuns);
    } catch (error) {
      console.error("Błąd podczas ładowania biegów z Supabase:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRuns();
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRuns([]);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(
      "running_calendar_settings",
      JSON.stringify(newSettings),
    );
  };

  const handleImportJSON = () => {
    alert(
      "Funkcja lokalnego importu została wyłączona na rzecz synchronizacji z Supabase.",
    );
  };

  // 3. ZAPIS / EDYCJA BIEGU
  const handleSaveRun = async (savedRun) => {
    try {
      const totalSeconds =
        Number(savedRun.durationH || 0) * 3600 +
        Number(savedRun.durationM || 0) * 60 +
        Number(savedRun.durationS || 0);

      const runDbPayload = {
        date: savedRun.date,
        distance: Number(savedRun.distance),
        duration: totalSeconds,
        avg_hr: savedRun.hr ? Number(savedRun.hr) : null,
        notes: savedRun.notes || null,
        source: savedRun.source || "manual",
        user_id: session.user.id,
      };

      const isEditing =
        typeof savedRun.id === "number" ||
        (typeof savedRun.id === "string" && !savedRun.id.startsWith("run_"));

      if (isEditing) {
        const { error } = await supabase
          .from("runs")
          .update(runDbPayload)
          .eq("id", savedRun.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("runs").insert([runDbPayload]);

        if (error) throw error;
      }

      setIsRunModalOpen(false);
      fetchRuns();
    } catch (error) {
      console.error("Błąd zapisu biegu:", error.message);
      alert("Nie udało się zapisać biegu.");
    }
  };

  const handleDeleteRun = async (runIdToDelete) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten bieg z bazy danych?")) {
      try {
        const { error } = await supabase
          .from("runs")
          .delete()
          .eq("id", runIdToDelete);

        if (error) throw error;

        setIsRunModalOpen(false);
        fetchRuns();
      } catch (error) {
        console.error("Błąd podczas usuwania biegu:", error.message);
        alert("Nie udało się usunąć biegu.");
      }
    }
  };

  const handleAddRunClick = (runId = null, dateStr = null) => {
    setSelectedRun(runId);
    setDefaultRunDate(dateStr);
    setIsRunModalOpen(true);
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#fff",
          background: "#121212",
          fontFamily: "sans-serif",
        }}
      >
        <h2>
          Weryfikacja sesji bezpiecznego kalendarza... Tarcza RLS aktywna 🛡️
        </h2>
      </div>
    );
  }

  // REWOLUCJA: Jeśli nie ma sesji, renderujemy dedykowany, czysty komponent
  if (!session) {
    return <LoginScreen />;
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          color: "#fff",
          background: "#121212",
          fontFamily: "sans-serif",
        }}
      >
        <h2>Bezpieczne wczytywanie Twoich kilometrów... 🏃‍♂️☁️</h2>
      </div>
    );
  }

  return (
    <>
      <div className={`app-container ${isSidebarOpen ? "" : "sidebar-hidden"}`}>
        <SidePanel
          onAddRunClick={() => handleAddRunClick(null, null)}
          onStatsClick={() => setActiveView("stats")}
          onCalendarClick={() => setActiveView("calendar")}
          onImportJSON={handleImportJSON}
          runs={runs}
        />

        <main
          className="calendar-panel glass-panel"
          style={{ display: activeView === "calendar" ? "block" : "none" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "10px 20px 0 0",
            }}
          >
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ background: "#d32f2f", color: "white", border: "none" }}
            >
              🚪 Wyloguj
            </button>
          </div>
          <CalendarView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            onToggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
            runs={runs}
            theme={theme}
            onToggleTheme={onToggleTheme}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onAddRunClick={handleAddRunClick}
          />
        </main>

        {activeView === "stats" && (
          <StatsPage
            runs={runs}
            onBackClick={() => setActiveView("calendar")}
            onToggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
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
