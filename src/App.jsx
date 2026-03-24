import { useState, useEffect, useCallback } from "react";
import { fetchBoards, fetchMyItems } from "./api.js";
import "./App.css";

const STATUS_COLORS = {
  "Done":          { bg: "#e1f5ee", text: "#0f6e56", dot: "#1d9e75" },
  "Working on it": { bg: "#faeeda", text: "#854f0b", dot: "#ef9f27" },
  "Stuck":         { bg: "#fcebeb", text: "#a32d2d", dot: "#e24b4a" },
  "Not Started":   { bg: "#f1efe8", text: "#5f5e5a", dot: "#888780" },
  "In Progress":   { bg: "#e6f1fb", text: "#185fa5", dot: "#378add" },
  "Review":        { bg: "#fbeaf0", text: "#993556", dot: "#d4537e" },
};

function getStatusStyle(status) {
  const key = Object.keys(STATUS_COLORS).find((k) =>
    status?.toLowerCase().includes(k.toLowerCase())
  );
  return STATUS_COLORS[key] || STATUS_COLORS["Not Started"];
}

function StatusBadge({ label }) {
  const s = getStatusStyle(label || "Not Started");
  return (
    <span className="status-badge" style={{ background: s.bg, color: s.text }}>
      <span className="status-dot" style={{ background: s.dot }} />
      {label || "No status"}
    </span>
  );
}

function Avatar({ name, size = 32 }) {
  const initials = name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const colors = ["#185fa5", "#0f6e56", "#854f0b", "#993556", "#534ab7"];
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0];
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: color + "22", color, border: `1.5px solid ${color}44` }}>
      {initials}
    </div>
  );
}

function Spinner({ message = "Loading your workspace…" }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ color }}>{value}</span>
    </div>
  );
}

export default function App() {
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Fetching boards…");
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [statusFilter, setStatusFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedBoards, setExpandedBoards] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTasks([]);
    setBoards([]);
    try {
      setLoadingMsg("Fetching boards…");
      const bList = await fetchBoards();
      setBoards(bList);

      const allTasks = [];
      const toScan = bList.slice(0, 10);
      for (let i = 0; i < toScan.length; i++) {
        const b = toScan[i];
        setLoadingMsg(`Scanning board ${i + 1} of ${toScan.length}: ${b.name.slice(0, 30)}…`);
        try {
          const t = await fetchMyItems(b.id, b.name);
          allTasks.push(...t);
          setTasks([...allTasks]);
        } catch {}
      }
    } catch (e) {
      setError(e.message || "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statuses = ["all", ...Array.from(new Set(tasks.map((t) => t.status).filter(Boolean)))];
  const boardNames = ["all", ...Array.from(new Set(tasks.map((t) => t.boardTitle).filter(Boolean)))];

  const filtered = tasks.filter((t) => {
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchBoard = boardFilter === "all" || t.boardTitle === boardFilter;
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchBoard && matchSearch;
  });

  const byStatus = tasks.reduce((acc, t) => {
    const s = t.status || "No status";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const byBoard = tasks.reduce((acc, t) => {
    acc[t.boardTitle] = (acc[t.boardTitle] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app">
      <div className="container">

        {/* Header */}
        <header className="header">
          <div className="header-left">
            <Avatar name="Zoren Pescador" size={40} />
            <div>
              <h1>My Work</h1>
              <p className="subtitle">Zoren Pescador · SEO Specialist</p>
            </div>
          </div>
          <button className="btn-refresh" onClick={load} disabled={loading}>
            <span style={{ display: "inline-block", animation: loading ? "spin 0.8s linear infinite" : "none" }}>↺</span>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </header>

        {/* Error Banner */}
        {error && <div className="error-banner">{error}</div>}

        {/* Stats */}
        {!loading && tasks.length > 0 && (
          <div className="stats-grid">
            <StatCard label="Total tasks" value={tasks.length} color="#378add" />
            <StatCard label="Boards" value={boards.length} color="#1d9e75" />
            <StatCard label="Done" value={byStatus["Done"] || 0} color="#1d9e75" />
            <StatCard label="In progress" value={(byStatus["Working on it"] || 0) + (byStatus["In Progress"] || 0)} color="#ef9f27" />
            <StatCard label="Stuck" value={byStatus["Stuck"] || 0} color="#e24b4a" />
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {["tasks", "boards"].map((t) => (
            <button key={t} className={`tab ${activeTab === t ? "tab-active" : ""}`} onClick={() => setActiveTab(t)}>
              {t === "tasks" ? "My Tasks" : "My Boards"}
              {t === "tasks" && tasks.length > 0 && <span className="tab-count">{tasks.length}</span>}
              {t === "boards" && boards.length > 0 && <span className="tab-count">{boards.length}</span>}
            </button>
          ))}
        </div>

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <>
            <div className="filters">
              <input
                className="filter-input"
                placeholder="Search tasks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {statuses.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
              </select>
              <select className="filter-select" value={boardFilter} onChange={(e) => setBoardFilter(e.target.value)}>
                {boardNames.map((b) => (
                  <option key={b} value={b}>{b === "all" ? "All boards" : b.length > 30 ? b.slice(0, 30) + "…" : b}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <Spinner message={loadingMsg} />
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <p>{tasks.length === 0 ? "No tasks assigned to you were found." : "No tasks match your filters."}</p>
              </div>
            ) : (
              <div className="task-list">
                {filtered.map((task, i) => (
                  <div key={task.id || i} className="task-item">
                    <div className="task-dot" style={{ borderColor: getStatusStyle(task.status).dot }} />
                    <div className="task-info">
                      <p className="task-name">{task.name}</p>
                      <p className="task-meta">
                        {task.boardTitle}
                        {task.dueDate ? ` · Due ${task.dueDate}` : ""}
                      </p>
                    </div>
                    <StatusBadge label={task.status} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Boards Tab */}
        {activeTab === "boards" && (
          <>
            {loading ? (
              <Spinner message={loadingMsg} />
            ) : boards.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No boards found.</p>
              </div>
            ) : (
              <div className="board-list">
                {boards.map((b, i) => {
                  const taskCount = byBoard[b.name] || 0;
                  const expanded = expandedBoards[b.id];
                  const boardTasks = tasks.filter((t) => t.boardTitle === b.name);
                  return (
                    <div key={b.id || i} className="board-card">
                      <div className="board-header" onClick={() => setExpandedBoards((p) => ({ ...p, [b.id]: !p[b.id] }))}>
                        <span className="board-chevron" style={{ transform: expanded ? "rotate(90deg)" : "none" }}>▶</span>
                        <span className="board-title">{b.name}</span>
                        <div className="board-actions">
                          {taskCount > 0 && <span className="board-badge">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>}
                          {b.url && (
                            <a href={b.url} onClick={(e) => e.stopPropagation()} className="board-link" target="_blank" rel="noopener noreferrer">
                              Open ↗
                            </a>
                          )}
                        </div>
                      </div>
                      {expanded && (
                        <div className="board-tasks">
                          {boardTasks.length === 0 ? (
                            <p className="board-empty">No tasks assigned to you in this board.</p>
                          ) : (
                            boardTasks.map((t, j) => (
                              <div key={t.id || j} className="board-task-row" style={{ borderBottom: j < boardTasks.length - 1 ? "0.5px solid #e5e7eb" : "none" }}>
                                <div className="task-dot-sm" style={{ background: getStatusStyle(t.status).dot }} />
                                <span className="board-task-name">{t.name}</span>
                                <StatusBadge label={t.status} />
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
