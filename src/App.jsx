import { useState, useEffect } from "react";
import "./styles.css";

function formatTime(seconds) {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export default function App() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [note, setNote] = useState("");
  const [sessions, setSessions] = useState([]);
  const [theme, setTheme] = useState("dark"); // "dark" | "light"

  // Load theme + sessions on first render
  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem("quicknote_theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      }

      const storedSessions = window.localStorage.getItem("quicknote_sessions");
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
    } catch (err) {
      console.error("Error reading from localStorage:", err);
    }
  }, []);

  // Apply theme class to <body> and persist theme
  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    try {
      window.localStorage.setItem("quicknote_theme", theme);
    } catch (err) {
      console.error("Error saving theme:", err);
    }
  }, [theme]);

  // Save sessions whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem(
        "quicknote_sessions",
        JSON.stringify(sessions)
      );
    } catch (err) {
      console.error("Error saving sessions to localStorage:", err);
    }
  }, [sessions]);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const intervalId = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  const handleSaveSession = () => {
    if (seconds === 0) return;

    const cleanedNote = note.trim() || "Untitled session";

    const newSession = {
      id: Date.now(),
      note: cleanedNote,
      durationSeconds: seconds,
      createdAt: new Date().toISOString()
    };

    setSessions((prev) => [newSession, ...prev]);
    setNote("");
    setIsRunning(false);
    setSeconds(0);
  };

  const handleDeleteSession = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearAll = () => {
    setSessions([]);
    try {
      window.localStorage.removeItem("quicknote_sessions");
    } catch (err) {
      console.error("Error clearing sessions:", err);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // ---- Task averages logic ----
  const taskStatsMap = sessions.reduce((acc, session) => {
    const key = session.note.toLowerCase();
    if (!acc[key]) {
      acc[key] = {
        name: session.note,
        totalSeconds: 0,
        count: 0
      };
    }
    acc[key].totalSeconds += session.durationSeconds;
    acc[key].count += 1;
    return acc;
  }, {});

  const taskStats = Object.values(taskStatsMap).map((task) => ({
    ...task,
    averageSeconds: task.totalSeconds / task.count
  }));

  // ---- Daily productivity stats ----
  const todayStr = new Date().toDateString();
  const todaysSessions = sessions.filter(
    (s) => new Date(s.createdAt).toDateString() === todayStr
  );
  const totalSecondsToday = todaysSessions.reduce(
    (sum, s) => sum + s.durationSeconds,
    0
  );
  const tasksTodayCount = new Set(
    todaysSessions.map((s) => s.note.toLowerCase())
  ).size;

  return (
    <div className={`app ${theme}`}>
      <header className="header">
        <div className="header-main">
          <div>
            <h1>QuickNote Timer</h1>
            <p>
              Track what you worked on, how long it took, and your average time
              per task.
            </p>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
        </div>
      </header>

      <section className="timer-section">
        <div className="timer-display">{formatTime(seconds)}</div>

        <div className="timer-buttons">
          {!isRunning ? (
            <button onClick={handleStart}>Start</button>
          ) : (
            <button onClick={handlePause}>Pause</button>
          )}
          <button onClick={handleReset} disabled={seconds === 0}>
            Reset
          </button>
        </div>

        <div className="note-input">
          <label>What are you working on?</label>
          <input
            type="text"
            placeholder="e.g., Studying data structures"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          className="save-button"
          onClick={handleSaveSession}
          disabled={seconds === 0}
        >
          Save Session
        </button>
      </section>

      <div className="clear-section">
        <button className="clear-button" onClick={handleClearAll}>
          Clear All Data
        </button>
      </div>

      {/* Today's productivity */}
      <section className="stats-section daily-section">
        <h2>Today&apos;s Productivity</h2>
        {todaysSessions.length === 0 ? (
          <p className="empty-state">
            No sessions logged today yet. Start the timer and save a session.
          </p>
        ) : (
          <ul className="stats-list">
            <li className="stats-item">
              <div className="stats-main">
                <span className="stats-name">Total focused time</span>
                <span className="stats-average">
                  {formatTime(totalSecondsToday)}
                </span>
              </div>
              <div className="stats-meta">
                <span>
                  {todaysSessions.length} session
                  {todaysSessions.length > 1 ? "s" : ""} •{" "}
                  {tasksTodayCount} task
                  {tasksTodayCount > 1 ? "s" : ""}
                </span>
              </div>
            </li>
          </ul>
        )}
      </section>

      {/* All sessions */}
      <section className="history-section">
        <h2>Session History</h2>
        {sessions.length === 0 ? (
          <p className="empty-state">No sessions saved yet.</p>
        ) : (
          <ul className="session-list">
            {sessions.map((session) => (
              <li key={session.id} className="session-item">
                <div className="session-main">
                  <span className="session-note">{session.note}</span>
                  <span className="session-duration">
                    {formatTime(session.durationSeconds)}
                  </span>
                </div>
                <div className="session-meta">
                  <span>{new Date(session.createdAt).toLocaleString()}</span>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteSession(session.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Task averages */}
      <section className="stats-section">
        <h2>Task Averages</h2>
        {taskStats.length === 0 ? (
          <p className="empty-state">
            Save a few sessions to see average time per task.
          </p>
        ) : (
          <ul className="stats-list">
            {taskStats.map((task) => (
              <li key={task.name} className="stats-item">
                <div className="stats-main">
                  <span className="stats-name">{task.name}</span>
                  <span className="stats-average">
                    {formatTime(Math.round(task.averageSeconds))}
                  </span>
                </div>
                <div className="stats-meta">
                  <span>
                    {task.count} session{task.count > 1 ? "s" : ""} • Total{" "}
                    {formatTime(task.totalSeconds)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
