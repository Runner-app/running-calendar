import { useState, useEffect } from "react";
import { supabase } from "./config/supabaseClient";
import SidePanel from "./components/SidePanel";
import TopMenu from "./components/TopMenu";
import CalendarView from "./components/CalendarView";
import StatsPage from "./components/StatsPage";
import RunEditModal from "./components/RunEditModal";
import LoginScreen from "./components/LoginScreen";
import RunDetailsView from "./components/RunDetailsView";
import "./styles/index.less";

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-mode");
    } else {
      document.body.classList.remove("light-mode");
    }
    localStorage.setItem("running_calendar_theme", theme);
  }, [theme]);

  const onToggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

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

        let computedTime = "19:00";

        if (
          run.date &&
          typeof run.date === "string" &&
          run.date.includes("T")
        ) {
          computedTime = run.date.substring(11, 16);
        }

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
          time: computedTime,
          computedNumber: run.id,
          computedStreak: 1,
          chart_records: run.chart_records,
        };
      });

      setRuns(formattedRuns);
    } catch (error) {
      console.error("Error while fetching runs from Supabase:", error.message);
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

  const handleSaveRun = async (savedRun) => {
    try {
      const totalSeconds =
        Number(savedRun.durationH || 0) * 3600 +
        Number(savedRun.durationM || 0) * 60 +
        Number(savedRun.durationS || 0);

      const runTime = savedRun.time || "19:00";
      const fullDateTimeString = `${savedRun.date}T${runTime}:00`;

      const runDbPayload = {
        date: fullDateTimeString,
        distance: Number(savedRun.distance),
        duration: totalSeconds,
        avg_hr: savedRun.hr ? Number(savedRun.hr) : null,
        notes: savedRun.notes || null,
        source: savedRun.source || "manual",
        user_id: session.user.id,
        chart_records: savedRun.chart_records || null,
      };

      const isEditing =
        typeof savedRun.id === "number" ||
        (typeof savedRun.id === "string" && !savedRun.id.startsWith("run_"));

      if (isEditing) {
        const { ...updatePayload } = runDbPayload;

        const { error } = await supabase
          .from("runs")
          .update(updatePayload)
          .eq("id", savedRun.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("runs").insert([runDbPayload]);

        if (error) throw error;
      }

      setIsRunModalOpen(false);
      fetchRuns();
    } catch (error) {
      console.error("Error while saving run:", error.message);
      alert("Failed to save run.");
    }
    setActiveView("calendar");
  };

  const handleDeleteRun = async (runIdToDelete) => {
    if (
      window.confirm(
        "Are you sure you want to delete this run from the database?",
      )
    ) {
      try {
        const { error } = await supabase
          .from("runs")
          .delete()
          .eq("id", runIdToDelete);

        if (error) throw error;

        setIsRunModalOpen(false);
        fetchRuns();
      } catch (error) {
        console.error("Error while deleting run:", error.message);
        alert("Failed to delete run.");
      }
    }
    setActiveView("calendar");
  };

  const handleAddRunClick = (runId = null, dateStr = null) => {
    if (runId) {
      setSelectedRun(runId);
      setActiveView("details");
    } else {
      setSelectedRun(null);
      setDefaultRunDate(dateStr);
      setIsRunModalOpen(true);
    }
  };

  const renderLoadingScreen = () => (
    <div className="loading-screen">
      <h2>Running 🏃</h2>
    </div>
  );

  if (!session) {
    if (authLoading) {
      return renderLoadingScreen();
    }
    return <LoginScreen />;
  }

  if (isLoading) {
    return renderLoadingScreen();
  }

  return (
    <>
      <div className={`app-container ${isSidebarOpen ? "" : "sidebar-hidden"}`}>
        <TopMenu
          onToggleSidebar={toggleSidebar}
          onToggleTheme={onToggleTheme}
          handleLogout={handleLogout}
          isSidebarOpen={isSidebarOpen}
        />

        <SidePanel
          onAddRunClick={() => handleAddRunClick(null, null)}
          onStatsClick={() => setActiveView("stats")}
          onCalendarClick={() => setActiveView("calendar")}
          runs={runs}
        />

        {activeView === "details" && (
          <RunDetailsView
            run={runs.find((r) => r.id === selectedRun)}
            onBackClick={() => setActiveView("calendar")}
            onEditClick={() => setIsRunModalOpen(true)}
          />
        )}

        <main
          className="calendar-panel glass-panel"
          style={{ display: activeView === "calendar" ? "block" : "none" }}
        >
          <CalendarView
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isSidebarOpen={isSidebarOpen}
            runs={runs}
            theme={theme}
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
