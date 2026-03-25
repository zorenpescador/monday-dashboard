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

const PRIORITY_COLORS = {
  "Critical": { bg: "#fcebeb", text: "#a32d2d", dot: "#e24b4a" },
  "High":     { bg: "#faeeda", text: "#854f0b", dot: "#ef9f27" },
  "Medium":   { bg: "#e6f1fb", text: "#185fa5", dot: "#378add" },
  "Low":      { bg: "#f1efe8", text: "#5f5e5a", dot: "#888780" },
};

function getStatusStyle(status) {
  const key = Object.keys(STATUS_COLORS).find((k) =>
    status?.toLowerCase().includes(k.toLowerCase())
  );
  return STATUS_COLORS[key] || STATUS_COLORS["Not Started"];
}

function getPriorityStyle(priority) {
  const key = Object.keys(PRIORITY_COLORS).find((k) =>
    priority?.toLowerCase().includes(k.toLowerCase())
  );
  return PRIORITY_COLORS[key] || { bg: "#f1efe8", text: "#5f5e5a", dot: "#888780" };
}

function getDueStatus(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (isNaN(due)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 3) return "soon";
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelative(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function sortTasks(tasks, sort) {
  const arr = [...tasks];
  if (sort === "dueDate") {
    arr.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  } else if (sort === "status") {
    arr.sort((a, b) => (a.status || "zzz").localeCompare(b.status || "zzz"));
  } else if (sort === "board") {
    arr.sort((a, b) => (a.boardTitle || "").localeCompare(b.boardTitle || ""));
  }
  return arr;
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

function PriorityBadge({ label }) {
  if (!label) return null;
  const s = getPriorityStyle(label);
  return (
    <span className="status-badge" style={{ background: s.bg, color: s.text }}>
      <span className="status-dot" style={{ background: s.dot }} />
      {label}
    </span>
  );
}

function DueLabel({ dueDate }) {
  if (!dueDate) return null;
  const status = getDueStatus(dueDate);
  const formatted = formatDate(dueDate);
  if (status === "overdue") return <span className="due-label due-overdue">Overdue · {formatted}</span>;
  if (status === "today")   return <span className="due-label due-today">Due today</span>;
  if (status === "soon")    return <span className="due-label due-soon">Due {formatted}</span>;
  return <span className="due-label">Due {formatted}</span>;
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

function TaskDetailPanel({ task, onClose }) {
  if (!task) return null;
  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2 className="panel-title">{task.name}</h2>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
        <div className="panel-body">
          <div className="panel-row">
            <span className="panel-field">Board</span>
            <span className="panel-val">{task.boardTitle}</span>
          </div>
          <div className="panel-row">
            <span className="panel-field">Status</span>
            <StatusBadge label={task.status} />
          </div>
          {task.priority && (
            <div className="panel-row">
              <span className="panel-field">Priority</span>
              <PriorityBadge label={task.priority} />
            </div>
          )}
          <div className="panel-row">
            <span className="panel-field">Due date</span>
            {task.dueDate
              ? <DueLabel dueDate={task.dueDate} />
              : <span className="panel-empty">No due date</span>}
          </div>
          {task.updatedAt && (
            <div className="panel-row">
              <span className="panel-field">Last updated</span>
              <span className="panel-val">{formatRelative(task.updatedAt)}</span>
            </div>
          )}
          {task.url && (
            <a href={task.url} target="_blank" rel="noopener noreferrer" className="panel-open-btn">
              Open in monday.com ↗
            </a>
          )}
          {task.updates?.length > 0 && (
            <div className="panel-updates">
              <h3 className="panel-updates-title">Recent updates</h3>
              {task.updates.map((u) => (
                <div key={u.id} className="panel-update-item">
                  <div className="panel-update-meta">
                    <strong>{u.creator?.name}</strong>
                    <span className="panel-update-time">{formatRelative(u.created_at)}</span>
                  </div>
                  <p className="panel-update-text">{u.text_body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function loadSavedBoardIds() {
  try { return new Set(JSON.parse(localStorage.getItem("selectedBoardIds") || "null") || []); }
  catch { return new Set(); }
}

function BoardPicker({ allBoards, selectedIds, onApply, onClose }) {
  const [draft, setDraft] = useState(new Set(selectedIds));
  const [search, setSearch] = useState("");

  const grouped = allBoards
    .filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    .reduce((acc, b) => {
      const ws = b.workspace?.name || "My Workspace";
      if (!acc[ws]) acc[ws] = [];
      acc[ws].push(b);
      return acc;
    }, {});

  const toggle = (id) => setDraft((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleWorkspace = (wsBoards) => {
    const allSelected = wsBoards.every((b) => draft.has(b.id));
    setDraft((prev) => {
      const next = new Set(prev);
      wsBoards.forEach((b) => allSelected ? next.delete(b.id) : next.add(b.id));
      return next;
    });
  };

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel picker-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2 className="panel-title">Select Boards to Track</h2>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
        <div className="picker-search-wrap">
          <input
            className="filter-input"
            placeholder="Search boards…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="picker-quick">
            <button className="picker-quick-btn" onClick={() => setDraft(new Set(allBoards.map((b) => b.id)))}>All</button>
            <button className="picker-quick-btn" onClick={() => setDraft(new Set())}>None</button>
          </div>
        </div>
        <div className="picker-body">
          {Object.entries(grouped).map(([ws, wsBoards]) => {
            const allSelected = wsBoards.every((b) => draft.has(b.id));
            return (
              <div key={ws} className="picker-workspace">
                <div className="picker-ws-header" onClick={() => toggleWorkspace(wsBoards)}>
                  <input type="checkbox" checked={allSelected} onChange={() => toggleWorkspace(wsBoards)} onClick={(e) => e.stopPropagation()} />
                  <span className="picker-ws-name">{ws}</span>
                  <span className="picker-ws-count">{wsBoards.filter((b) => draft.has(b.id)).length}/{wsBoards.length}</span>
                </div>
                {wsBoards.map((b) => (
                  <label key={b.id} className="picker-board-row">
                    <input type="checkbox" checked={draft.has(b.id)} onChange={() => toggle(b.id)} />
                    <span className="picker-board-name">{b.name}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
        <div className="picker-footer">
          <span className="picker-count">{draft.size} board{draft.size !== 1 ? "s" : ""} selected</span>
          <button className="panel-open-btn" onClick={() => onApply(draft)} disabled={draft.size === 0}>
            Apply & Refresh
          </button>
        </div>
      </div>
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
  const [sort, setSort] = useState("dueDate");
  const [expandedBoards, setExpandedBoards] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [allBoards, setAllBoards] = useState([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState(loadSavedBoardIds);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const load = useCallback(async (boardIds) => {
    setLoading(true);
    setError(null);
    setTasks([]);
    setBoards([]);
    try {
      setLoadingMsg("Fetching boards…");
      const bList = await fetchBoards();
      setAllBoards(bList);

      // If no selection saved yet, default to all boards
      const ids = boardIds && boardIds.size > 0 ? boardIds : new Set(bList.map((b) => b.id));
      if (!boardIds || boardIds.size === 0) {
        setSelectedBoardIds(ids);
        localStorage.setItem("selectedBoardIds", JSON.stringify([...ids]));
      }

      const toScan = bList.filter((b) => ids.has(b.id));
      setBoards(toScan);

      const allTasks = [];
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

  const handleApplyPicker = (newIds) => {
    setSelectedBoardIds(newIds);
    localStorage.setItem("selectedBoardIds", JSON.stringify([...newIds]));
    setShowPicker(false);
    load(newIds);
  };

  useEffect(() => { load(selectedBoardIds); }, [load]);

  const statuses = ["all", ...Array.from(new Set(tasks.map((t) => t.status).filter(Boolean)))];
  const boardNames = ["all", ...Array.from(new Set(tasks.map((t) => t.boardTitle).filter(Boolean)))];

  const filtered = sortTasks(
    tasks.filter((t) => {
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchBoard = boardFilter === "all" || t.boardTitle === boardFilter;
      const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchBoard && matchSearch;
    }),
    sort
  );

  const todayTasks = tasks.filter((t) => {
    const s = getDueStatus(t.dueDate);
    return s === "today" || s === "overdue";
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

  const allUpdates = tasks
    .flatMap((t) => (t.updates || []).map((u) => ({ ...u, taskName: t.name, boardTitle: t.boardTitle, taskUrl: t.url })))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 30);

  return (
    <div className={`app${darkMode ? " dark" : ""}`}>
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
          <div className="header-actions">
            <button className="btn-icon" onClick={() => setDarkMode((d) => !d)} title="Toggle dark mode">
              {darkMode ? "☀" : "☾"}
            </button>
            <button className="btn-refresh" onClick={() => setShowPicker(true)} disabled={loading} title="Select boards">
              ⊞ Boards {selectedBoardIds.size > 0 ? `(${selectedBoardIds.size})` : ""}
            </button>
            <button className="btn-refresh" onClick={() => load(selectedBoardIds)} disabled={loading}>
              <span style={{ display: "inline-block", animation: loading ? "spin 0.8s linear infinite" : "none" }}>↺</span>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
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

        {/* Today's Focus */}
        {!loading && todayTasks.length > 0 && activeTab === "tasks" && (
          <div className="focus-section">
            <h3 className="focus-heading">Today's Focus</h3>
            <div className="task-list">
              {todayTasks.map((task, i) => (
                <div key={task.id || i} className="task-item task-item-focus" onClick={() => setSelectedTask(task)}>
                  <div className="task-dot" style={{ borderColor: getStatusStyle(task.status).dot }} />
                  <div className="task-info">
                    <p className="task-name">{task.name}</p>
                    <p className="task-meta">{task.boardTitle}</p>
                  </div>
                  <div className="task-badges">
                    <DueLabel dueDate={task.dueDate} />
                    <StatusBadge label={task.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {["tasks", "boards", "updates"].map((t) => (
            <button key={t} className={`tab ${activeTab === t ? "tab-active" : ""}`} onClick={() => setActiveTab(t)}>
              {t === "tasks" ? "My Tasks" : t === "boards" ? "My Boards" : "Updates"}
              {t === "tasks" && tasks.length > 0 && <span className="tab-count">{tasks.length}</span>}
              {t === "boards" && boards.length > 0 && <span className="tab-count">{boards.length}</span>}
              {t === "updates" && allUpdates.length > 0 && <span className="tab-count">{allUpdates.length}</span>}
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
              <select className="filter-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="dueDate">Sort: Due date</option>
                <option value="status">Sort: Status</option>
                <option value="board">Sort: Board</option>
                <option value="none">Sort: Default</option>
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
                  <div key={task.id || i} className="task-item" onClick={() => setSelectedTask(task)}>
                    <div className="task-dot" style={{ borderColor: getStatusStyle(task.status).dot }} />
                    <div className="task-info">
                      <p className="task-name">{task.name}</p>
                      <div className="task-meta">
                        <span>{task.boardTitle}</span>
                        {task.dueDate && <DueLabel dueDate={task.dueDate} />}
                      </div>
                    </div>
                    <div className="task-badges">
                      {task.priority && <PriorityBadge label={task.priority} />}
                      <StatusBadge label={task.status} />
                    </div>
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
                <div className="empty-icon">☰</div>
                <p>No boards found.</p>
              </div>
            ) : (
              <div className="board-list">
                {Object.entries(
                  boards.reduce((acc, b) => {
                    const ws = b.workspace?.name || "My Workspace";
                    if (!acc[ws]) acc[ws] = [];
                    acc[ws].push(b);
                    return acc;
                  }, {})
                ).map(([workspace, wsBoards]) => (
                  <div key={workspace} className="workspace-group">
                    <h3 className="workspace-heading">{workspace}</h3>
                    {wsBoards.map((b, i) => {
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
                                  <div key={t.id || j} className="board-task-row" onClick={() => setSelectedTask(t)} style={{ borderBottom: j < boardTasks.length - 1 ? "0.5px solid #e5e7eb" : "none" }}>
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
                ))}
              </div>
            )}
          </>
        )}

        {/* Updates Tab */}
        {activeTab === "updates" && (
          <>
            {loading ? (
              <Spinner message={loadingMsg} />
            ) : allUpdates.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">☁</div>
                <p>No recent updates found.</p>
              </div>
            ) : (
              <div className="updates-feed">
                {allUpdates.map((u, i) => (
                  <div key={u.id || i} className="update-item">
                    <div className="update-header">
                      <Avatar name={u.creator?.name} size={28} />
                      <div className="update-meta">
                        <span className="update-author">{u.creator?.name}</span>
                        <span className="update-time">{formatRelative(u.created_at)}</span>
                      </div>
                    </div>
                    <p className="update-text">{u.text_body}</p>
                    <div className="update-task-ref">
                      {u.taskUrl ? (
                        <a href={u.taskUrl} target="_blank" rel="noopener noreferrer" className="update-task-link">
                          {u.taskName} · {u.boardTitle}
                        </a>
                      ) : (
                        <span>{u.taskName} · {u.boardTitle}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>

      <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />

      {showPicker && (
        <BoardPicker
          allBoards={allBoards}
          selectedIds={selectedBoardIds}
          onApply={handleApplyPicker}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
