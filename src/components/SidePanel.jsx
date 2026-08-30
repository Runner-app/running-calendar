function SidePanel({
  activeView,
  setActiveView,
  theme,
  onToggleTheme,
  handleLogout,
}) {
  return (
    <aside className="sidebar-rail">
      <div className="sidebar-brand" title="RunUp">
        <img src="/images/runup-logo.svg" alt="RunUp" className="brandLogo" />
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-btn ${activeView === "calendar" ? "active" : ""}`}
          onClick={() => setActiveView("calendar")}
          title="Calendar"
        >
          <img src="/images/icons/date.svg" alt="Calendar" className="icon" />
        </button>

        <button
          className={`sidebar-btn ${activeView === "stats" ? "active" : ""}`}
          onClick={() => setActiveView("stats")}
          title="Statistics"
        >
          <img src="/images/icons/graph.svg" alt="Statistics" className="icon" />
        </button>
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
        >
          {theme === "dark" ? (
            <img src="/images/icons/sun.svg" alt="Light Mode" className="icon" />
          ) : (
            <img src="/images/icons/moon.svg" alt="Dark Mode" className="icon" />
          )}
        </button>

        <button
          className="sidebar-btn btn-danger"
          onClick={handleLogout}
          title="Sign out"
        >
          <img src="/images/icons/sign-out.svg" alt="Sign out" className="icon" />
        </button>
      </div>
    </aside>
  );
}

export default SidePanel;