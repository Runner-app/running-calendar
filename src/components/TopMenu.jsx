function TopMenu({
  theme,
  onToggleTheme,
  onToggleSidebar,
  isSidebarOpen,
  handleLogout,
}) {
  return (
    <div className="menu-actions">
      <button className="btn btn-secondary" onClick={onToggleSidebar}>
        📊 {isSidebarOpen ? "Hide" : "Show"} Panel
      </button>
      <button className="btn btn-secondary" onClick={onToggleTheme}>
        {theme === "dark" ? "🌙" : "☀️"}
      </button>
      <button onClick={handleLogout} className="btn btn-secondary btn-danger">
        Sign out
      </button>
    </div>
  );
}

export default TopMenu;
