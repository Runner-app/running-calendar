function SidePanel({activeView, setActiveView, theme, onToggleTheme, handleLogout}) {
  return (
    <aside className="sidebarRail">
      <div className="sidebarBrand" title="RunUp">
        <img src="/images/runup-logo.svg" alt="RunUp" className="brandLogo" />
      </div>

      <nav className="sidebarNav">
        <button
          className={`sidebarButton ${activeView === "calendar" ? "active" : ""}`}
          onClick={() => setActiveView("calendar")}
          title="Calendar"
        >
          <img src="/images/icons/calendar.svg" alt="Calendar" className="icon" />
        </button>

        <button
          className={`sidebarButton ${activeView === "stats" ? "active" : ""}`}
          onClick={() => setActiveView("stats")}
          title="Statistics"
        >
          <img src="/images/icons/graph.svg" alt="Statistics" className="icon" />
        </button>
      </nav>

      <div className="sidebarFooter">
        <button
          className="sidebarButton"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
        >
          {theme === "dark" ? (
            <img src="/images/icons/sun.svg" alt="Light Mode" className="icon" />
          ) : (
            <img src="/images/icons/moon.svg" alt="Dark Mode" className="icon" />
          )}
        </button>

        <button className="sidebarButton buttonRed" onClick={handleLogout} title="Sign out">
          <img src="/images/icons/sign-out.svg" alt="Sign out" className="icon" />
        </button>
      </div>
    </aside>
  );
}

export default SidePanel;