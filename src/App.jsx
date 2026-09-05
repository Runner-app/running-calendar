import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./config/supabaseClient";
import SidePanel from "./components/SidePanel";
import CalendarView from "./components/CalendarView";
import StatsPage from "./components/StatsPage";
import RunEditModal from "./components/RunEditModal";
import LoginScreen from "./components/LoginScreen";
import RunDetailsView from "./components/RunDetailsView";
import "./styles/index.less";

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const sessionRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("running_calendar_theme") || "light";
  });
  const [settings, setSettings] = useState({ weeklyGoals: {} });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [runs, setRuns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [activeView, setActiveView] = useState("calendar");
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [defaultRunDate, setDefaultRunDate] = useState(null);

  const fetchRuns = useCallback(async () => {
    if (!sessionRef.current?.user) return;
    try {
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
          weather_data: run.weather_data,
          mountainRun: run.mountain_run || false,
        };
      });
      setRuns(formattedRuns);
    } catch (error) {
      console.error("Error while fetching runs from Supabase:", error.message);
    }
  }, []);

  const fetchGoals = useCallback(async () => {
    if (!sessionRef.current?.user) return;
    try {
      const { data, error } = await supabase
        .from("weekly_goals")
        .select("week_key, daily_goal_km");
      if (error) throw error;
      const goalsObject = data.reduce((acc, curr) => {
        acc[curr.week_key] = curr.daily_goal_km;
        return acc;
      }, {});
      setSettings({ weeklyGoals: goalsObject });
    } catch (error) {
      console.error(
        "Error while fetching weekly goals from Supabase:",
        error.message,
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      sessionRef.current = s;
      setSession(s);
      setAuthLoading(false);
      if (s) {
        setIsLoading(true);
        Promise.all([fetchRuns(), fetchGoals()]).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
      supabase.auth.startAutoRefresh();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      sessionRef.current = s;

      if (event === "SIGNED_OUT") {
        setSession(null);
        setRuns([]);
        setIsLoading(false);
      } else if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setSession(s);
        setIsLoading(true);
        Promise.all([fetchRuns(), fetchGoals()]).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      supabase.auth.stopAutoRefresh();
    };
  }, [fetchRuns, fetchGoals]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRuns([]);
  };

  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings);
    if (!sessionRef.current?.user) return;
    try {
      const goals = newSettings.weeklyGoals || {};
      const payload = Object.entries(goals).map(([weekKey, value]) => ({
        user_id: sessionRef.current.user.id,
        week_key: weekKey,
        daily_goal_km: Number(value) || 0,
      }));
      if (payload.length === 0) return;
      const { error } = await supabase
        .from("weekly_goals")
        .upsert(payload, { onConflict: "user_id,week_key" });
      if (error) throw error;
    } catch (error) {
      console.error(
        "Error while saving weekly goals to Supabase:",
        error.message,
      );
      alert("Failed to save your weekly goal to the cloud.");
    }
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
        user_id: sessionRef.current.user.id,
        chart_records: savedRun.chart_records || null,
        weather_data: savedRun.weather_data || null,
        mountain_run: savedRun.mountainRun || false,
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
      setSelectedRun(null);
      setDefaultRunDate(null);
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
        setSelectedRun(null);
        setDefaultRunDate(null);
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
    <div className="loadingScreen">
      <h2>Running <img src="/images/loading-gif.gif" alt="Loading" className="runnerGif" /></h2>
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
      <div className="appContainer">
        <SidePanel
          activeView={activeView}
          setActiveView={setActiveView}
          theme={theme}
          onToggleTheme={onToggleTheme}
          handleLogout={handleLogout}
        />

        <main className="mainContent">
          {activeView === "calendar" && (
            <div className="calendarPanel glassPanel">
              <CalendarView
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                runs={runs}
                theme={theme}
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onAddRunClick={handleAddRunClick}
              />
            </div>
          )}

          {activeView === "stats" && <StatsPage runs={runs} />}

          {activeView === "details" && (
            <RunDetailsView
              run={runs.find((r) => r.id === selectedRun)}
              onBackClick={() => setActiveView("calendar")}
              onEditClick={() => setIsRunModalOpen(true)}
            />
          )}
        </main>
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