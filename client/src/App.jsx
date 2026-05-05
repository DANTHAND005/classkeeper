// App.jsx - the entire frontend of ClassKeeper lives in this one file
// it handles all the pages, components, API calls, and state management
// built with React and React Router

import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti"; // confetti explosion when homework is completed
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CirclePlus,
  FileText,
  GraduationCap,
  GripVertical,
  LayoutDashboard,
  LogOut,
  Moon,
  Pencil,
  Search,
  Settings,
  Sun,
  Timer,
  Trash2,
  Zap,
} from "lucide-react"; // icon library
import "./App.css";

// base URL for all API requests - uses the Vite proxy in dev
const API_URL = import.meta.env.VITE_API_URL || "/api";

// blank form templates so I can reset forms easily after submitting
const priorities = ["Low", "Medium", "High"];
const COLOR_PRESETS = ["#3B82F6", "#EF4444", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];
const eventTypes = ["Activity", "Event", "Test", "Reminder"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const blankCourse = { name: "", teacher: "", room: "", color: "#3B82F6", schedule: [] };
const blankHomework = { title: "", description: "", dueDate: "", dueTime: "", priority: "Medium", course: "", color: "#3B82F6" };
const blankEvent = { title: "", type: "Event", date: "", time: "", location: "", notes: "", color: "#22C55E" };

// pomodoro timer modes with their durations in seconds
const POMODORO_MODES = [
  { label: "Focus", duration: 25 * 60 },
  { label: "Short Break", duration: 5 * 60 },
  { label: "Long Break", duration: 15 * 60 },
];

// date helpers

// returns today as a "YYYY-MM-DD" string for easy comparisons
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// formats a date object into something readable like "May 5, 2026"
// uses UTC methods so the date doesnt shift due to timezone
function formatDate(value) {
  if (!value) return "No date";
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// converts a date to "YYYY-MM-DD" string using UTC so it stays consistent
function normalizeDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// converts a Date object to a "YYYY-MM-DD" key using UTC
function dayKey(date) {
  if (!date) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10);
}

// converts "14:30" to "2:30 PM"
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// returns true if a homework item is past due and not completed
function isOverdue(item) {
  return normalizeDate(item.dueDate) < todayKey() && !item.completed;
}

// returns a "YYYY-MM-DD" key for n days from today (used for grouping homework)
function offsetDayKey(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

// picks an icon based on the event type
function eventTypeIcon(type) {
  if (type === "Test") return <FileText size={14} />;
  if (type === "Reminder") return <Bell size={14} />;
  if (type === "Activity") return <Zap size={14} />;
  return <CalendarDays size={14} />;
}

// converts "HH:MM" time string to total minutes (used for schedule positioning)
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// custom hooks

// useAuth - stores token in localStorage so you stay logged in after refresh
function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("classkeeperToken"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("classkeeperUser");
    return saved ? JSON.parse(saved) : null;
  });

  // saves the token and user info to localStorage and state after login/register
  function saveSession(payload) {
    localStorage.setItem("classkeeperToken", payload.token);
    localStorage.setItem("classkeeperUser", JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  }

  // clears everything on logout
  function logout() {
    localStorage.removeItem("classkeeperToken");
    localStorage.removeItem("classkeeperUser");
    setToken(null);
    setUser(null);
  }

  return { token, user, saveSession, logout };
}

// useTheme - toggles dark mode, done in useState so there's no flash on load
function useTheme() {
  const [dark, setDark] = useState(() => {
    const isDark = localStorage.getItem("classkeeperTheme") === "dark";
    if (isDark) document.documentElement.classList.add("dark");
    return isDark;
  });

  function toggle() {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("classkeeperTheme", next ? "dark" : "light");
      return next;
    });
  }

  return { dark, toggle };
}

// root component

// App - sets up routes between login and the main app
function App() {
  const auth = useAuth();
  const theme = useTheme();

  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" auth={auth} />} />
      <Route path="/register" element={<AuthPage mode="register" auth={auth} />} />
      {/* everything else requires login */}
      <Route
        path="/*"
        element={
          <Protected token={auth.token}>
            <Shell auth={auth} theme={theme} />
          </Protected>
        }
      />
    </Routes>
  );
}

// redirects to login if there is no token
function Protected({ token, children }) {
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// auth page

// AuthPage - login and register share this component, mode prop picks which form
function AuthPage({ mode, auth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  // if already logged in, skip to the dashboard
  if (auth.token) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      // only send name on register, not login
      const body = isRegister ? form : { email: form.email, password: form.password };
      const response = await fetch(`${API_URL}/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Authentication failed");
      auth.saveSession(data);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark">
          <GraduationCap size={32} />
        </div>
        <h1>ClassKeeper</h1>
        <p>{isRegister ? "Create your student planner account." : "Welcome back to your school dashboard."}</p>
        <form onSubmit={submit} className="stacked-form">
          {isRegister && (
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create Account" : "Log In"}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? "Already have an account?" : "Need an account?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Log in" : "Register"}</Link>
        </p>
      </section>
    </main>
  );
}

// main shell

// Shell - main app layout, holds all shared data and API calls so pages don't re-fetch
function Shell({ auth, theme }) {
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [homework, setHomework] = useState([]);
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState(""); // green success message
  const [error, setError] = useState("");   // red error message
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  // build auth headers once and reuse them for every API call
  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` }),
    [auth.token]
  );

  // generic API helper - all fetch calls go through this
  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Something went wrong");
    return data;
  }

  // loads all data from the server at once
  async function refreshData() {
    setLoading(true);
    setError("");
    try {
      const [courseData, homeworkData, eventData] = await Promise.all([
        api("/courses"),
        api("/homework"),
        api("/events"),
      ]);
      setCourses(courseData);
      setHomework(homeworkData);
      setEvents(eventData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // fetch data when the app first loads
  useEffect(() => { refreshData(); }, []);

  // save or update a course and update the list in state
  async function saveCourse(course, editingId) {
    const saved = await api(editingId ? `/courses/${editingId}` : "/courses", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(course),
    });
    setCourses((items) => editingId ? items.map((i) => (i._id === editingId ? saved : i)) : [...items, saved]);
    setNotice(editingId ? "Course updated." : "Course added.");
  }

  // save or update a homework item and update the list in state
  async function saveHomework(item, editingId) {
    const payload = { ...item, course: item.course || null };
    const saved = await api(editingId ? `/homework/${editingId}` : "/homework", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    setHomework((items) => editingId ? items.map((i) => (i._id === editingId ? saved : i)) : [...items, saved]);
    setNotice(editingId ? "Homework updated." : "Homework added.");
  }

  // save or update an event and update the list in state
  async function saveEvent(item, editingId) {
    const saved = await api(editingId ? `/events/${editingId}` : "/events", {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(item),
    });
    setEvents((items) => editingId ? items.map((i) => (i._id === editingId ? saved : i)) : [...items, saved]);
    setNotice(editingId ? "Event updated." : "Event added.");
  }

  // delete any item by kind ("courses", "homework", "events") and remove from state
  async function deleteItem(kind, id) {
    await api(`/${kind}/${id}`, { method: "DELETE" });
    if (kind === "courses") setCourses((items) => items.filter((i) => i._id !== id));
    if (kind === "homework") setHomework((items) => items.filter((i) => i._id !== id));
    if (kind === "events") setEvents((items) => items.filter((i) => i._id !== id));
    setNotice("Item deleted.");
  }

  // toggle a homework item complete/incomplete and fire confetti if completing it
  async function toggleHomework(item) {
    const saved = await api(`/homework/${item._id}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !item.completed }),
    });
    setHomework((items) => items.map((i) => (i._id === item._id ? saved : i)));
    if (!item.completed) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }

  // count overdue + due today for the red badge on the homework nav item
  const homeworkBadge = homework.filter(
    (h) => !h.completed && (isOverdue(h) || normalizeDate(h.dueDate) === todayKey())
  ).length;

  return (
    <div className="app-shell">
      {/* sidebar - desktop navigation */}
      <aside className="sidebar">
        <Link className="logo" to="/">
          <GraduationCap />
          <span>ClassKeeper</span>
        </Link>

        {/* shows the logged in users name and email */}
        <div className="user-block">
          <div className="user-avatar">{(auth.user?.name || "S")[0].toUpperCase()}</div>
          <div>
            <p className="user-block-name">{auth.user?.name}</p>
            <p className="user-block-email">{auth.user?.email}</p>
          </div>
        </div>

        <nav>
          <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location.pathname === "/"} />
          <NavItem to="/schedule" icon={<CalendarCheck size={18} />} label="Schedule" active={location.pathname === "/schedule"} />
          <NavItem to="/homework" icon={<BookOpen size={18} />} label="Homework" active={location.pathname === "/homework"} badge={homeworkBadge} />
          <NavItem to="/courses" icon={<GraduationCap size={18} />} label="Courses" active={location.pathname === "/courses"} />
          <NavItem to="/events" icon={<CalendarDays size={18} />} label="Events" active={location.pathname === "/events"} />
          <NavItem to="/timer" icon={<Timer size={18} />} label="Study Timer" active={location.pathname === "/timer"} />
        </nav>

        {/* settings and logout pinned to the bottom of the sidebar */}
        <div className="sidebar-bottom">
          <NavItem to="/settings" icon={<Settings size={18} />} label="Settings" active={location.pathname === "/settings"} />
          <button className="ghost-button logout" onClick={auth.logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* main content area */}
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="topbar-date">
              {new Date().toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1>Welcome back, {auth.user?.name || "student"}</h1>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button icon-button" title="Search" onClick={() => setSearchOpen(true)}>
              <Search size={18} />
            </button>
            <button className="secondary-button" onClick={refreshData}>Refresh</button>
          </div>
        </header>

        {/* success and error banners */}
        {notice && <div className="notice" onAnimationEnd={() => setNotice("")}>{notice}</div>}
        {error && <div className="form-error">{error}</div>}

        {/* show skeleton while loading, then fade in the page */}
        {loading ? (
          <SkeletonLoader />
        ) : (
          <div key={location.pathname} className="page-fade">
            <Routes>
              <Route path="/" element={<Dashboard courses={courses} homework={homework} events={events} />} />
              <Route path="/homework" element={<HomeworkPage courses={courses} homework={homework} onSave={saveHomework} onDelete={deleteItem} onToggle={toggleHomework} />} />
              <Route path="/courses" element={<CoursesPage courses={courses} onSave={saveCourse} onDelete={deleteItem} />} />
              <Route path="/schedule" element={<SchedulePage courses={courses} />} />
              <Route path="/events" element={<EventsPage events={events} onSave={saveEvent} onDelete={deleteItem} />} />
              <Route path="/timer" element={<PomodoroPage />} />
              <Route path="/settings" element={<SettingsPage api={api} user={auth.user} onUpdate={auth.saveSession} theme={theme} onImportDone={refreshData} />} />
            </Routes>
          </div>
        )}
      </main>

      {/* search modal - only rendered when the search button is clicked */}
      {searchOpen && (
        <SearchOverlay homework={homework} courses={courses} events={events} onClose={() => setSearchOpen(false)} />
      )}

      {/* mobile bottom navigation bar */}
      <BottomNav homeworkBadge={homeworkBadge} />
    </div>
  );
}

// nav components

// NavItem - sidebar link with optional red badge
function NavItem({ to, icon, label, active, badge }) {
  return (
    <Link className={`nav-item ${active ? "active" : ""}`} to={to}>
      {icon}
      {label}
      {badge > 0 && <span className="nav-badge">{badge > 9 ? "9+" : badge}</span>}
    </Link>
  );
}

// BottomNav - fixed bottom nav shown on mobile
function BottomNav({ homeworkBadge }) {
  const location = useLocation();
  return (
    <nav className="bottom-nav">
      <Link className={`bottom-nav-item ${location.pathname === "/" ? "active" : ""}`} to="/">
        <LayoutDashboard size={20} />
        Dashboard
      </Link>
      <Link className={`bottom-nav-item ${location.pathname === "/homework" ? "active" : ""}`} to="/homework">
        <span className="bottom-icon-wrap">
          <BookOpen size={20} />
          {homeworkBadge > 0 && <span className="bottom-badge-dot" />}
        </span>
        Homework
      </Link>
      <Link className={`bottom-nav-item ${location.pathname === "/courses" ? "active" : ""}`} to="/courses">
        <GraduationCap size={20} />
        Courses
      </Link>
      <Link className={`bottom-nav-item ${location.pathname === "/events" ? "active" : ""}`} to="/events">
        <CalendarDays size={20} />
        Events
      </Link>
      <Link className={`bottom-nav-item ${location.pathname === "/settings" ? "active" : ""}`} to="/settings">
        <Settings size={20} />
        Settings
      </Link>
    </nav>
  );
}

// dashboard

// Dashboard - home page with calendar and stats
function Dashboard({ courses, homework, events }) {
  const [calDate, setCalDate] = useState(() => new Date()); // which month is showing
  const [selected, setSelected] = useState(null); // item clicked on the calendar

  // build the calendar grid for the current month
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const monthLabel = calDate.toLocaleString("default", { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay(); // which day of week the month starts on

  // fill in null cells before the first day so the grid lines up
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null); // pad end to complete the last row

  const today = todayKey();

  // returns all homework and events that fall on a given calendar day
  function itemsOnDay(date) {
    const k = dayKey(date);
    if (!k) return [];
    const hw = homework.filter((item) => normalizeDate(item.dueDate) === k).map((item) => ({ ...item, _kind: "hw" }));
    const ev = events.filter((item) => normalizeDate(item.date) === k).map((item) => ({ ...item, _kind: "ev" }));
    return [...hw, ...ev];
  }

  // stats for the sidebar
  const dueToday = homework.filter((item) => normalizeDate(item.dueDate) === today && !item.completed);
  const overdue = homework.filter(isOverdue);
  const upcoming = homework
    .filter((item) => normalizeDate(item.dueDate) > today && !item.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const completedCount = homework.filter((item) => item.completed).length;

  return (
    <div className="dashboard">
      <section className="panel calendar-panel">
        {/* calendar header with month navigation */}
        <div className="cal-header">
          <button className="cal-nav-btn" onClick={() => setCalDate(new Date(year, month - 1, 1))}>&#8249;</button>
          <h2 className="cal-month-title">{monthLabel}</h2>
          <button className="cal-nav-btn" onClick={() => setCalDate(new Date(year, month + 1, 1))}>&#8250;</button>
          <button className="cal-today-btn" onClick={() => setCalDate(new Date())}>Today</button>
        </div>

        {/* calendar grid - 7 columns, one per day of the week */}
        <div className="cal-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dow) => (
            <div key={dow} className="cal-dow">{dow}</div>
          ))}
          {cells.map((date, idx) => {
            const k = dayKey(date);
            const isToday = k === today;
            const allItems = itemsOnDay(date);
            return (
              <div key={idx} className={`cal-cell${!date ? " cal-cell--empty" : ""}${isToday ? " cal-cell--today" : ""}`}>
                {date && <span className="cal-day-num">{date.getDate()}</span>}
                {/* show all homework and events as colored chips, no limit */}
                <div className="cal-chips">
                  {allItems.map((item) => (
                    <span
                      key={item._id}
                      className={`cal-chip${item._kind === "ev" ? " cal-chip--event" : ""}${item.completed ? " cal-chip--done" : ""}`}
                      style={{ "--chip-color": item.color }}
                      onClick={() => setSelected(item)}
                    >
                      {item.title}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {homework.length === 0 && events.length === 0 && (
          <p className="cal-empty-hint">Add homework or events to see them on the calendar.</p>
        )}
        <div className="cal-legend">
          <span className="cal-legend-item"><span className="cal-legend-hw" /> Assignment</span>
          <span className="cal-legend-item"><span className="cal-legend-ev" /> Event</span>
        </div>
      </section>

      {/* right sidebar with stats and upcoming list */}
      <aside className="dashboard-side">
        <div className="dash-stats">
          <Stat label="Due Today" value={dueToday.length} />
          <Stat label="Upcoming" value={upcoming.length} />
          <Stat label="Overdue" value={overdue.length} tone="danger" />
          <Stat label="Completed" value={completedCount} tone="success" />
        </div>
        {courses.length > 0 && (
          <Panel title="Courses">
            <div className="course-strip">
              {courses.map((course) => <CoursePill key={course._id} course={course} />)}
            </div>
          </Panel>
        )}
        <Panel title="Upcoming Assignments">
          <ItemList
            empty="No upcoming assignments."
            items={upcoming.slice(0, 6)}
            render={(item) => <HomeworkCard item={item} compact />}
          />
        </Panel>
      </aside>

      {/* popup when clicking a calendar chip */}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// DetailModal - popup that shows full details when clicking a calendar chip
function DetailModal({ item, onClose }) {
  const isHomework = item._kind === "hw";
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ "--modal-color": item.color }}>
          <h3>{item.title}</h3>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="modal-body">
          {isHomework ? (
            <>
              {/* show ClassKeeper course name, then Canvas course name, then "No course" */}
              <p><span>Course</span>{item.course?.name || item.canvasCourseName || "No course"}</p>
              <p><span>Due</span>{formatDate(item.dueDate)}{item.dueTime ? ` at ${formatTime(item.dueTime)}` : ""}</p>
              <p><span>Priority</span>{item.priority}</p>
              <p><span>Status</span>{item.completed ? "Completed" : "Not completed"}</p>
              {item.description && <p><span>Notes</span>{item.description}</p>}
            </>
          ) : (
            <>
              <p><span>Type</span>{item.type}</p>
              <p><span>Date</span>{formatDate(item.date)}</p>
              {item.time && <p><span>Time</span>{item.time}</p>}
              {item.location && <p><span>Location</span>{item.location}</p>}
              {item.notes && <p><span>Notes</span>{item.notes}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat - animated counter card for the dashboard stats
function Stat({ label, value, tone = "" }) {
  const [display, setDisplay] = useState(0);

  // count up to the value with a quick animation
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + Math.ceil(value / 20), value);
      setDisplay(current);
      if (current >= value) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <article className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{display}</strong>
    </article>
  );
}

// SkeletonLoader - grey shimmer boxes shown while data is loading
function SkeletonLoader() {
  return (
    <div className="skeleton-wrap">
      <div className="skeleton-stats">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton-box skeleton-stat" />)}
      </div>
      <div className="skeleton-box skeleton-cal" />
    </div>
  );
}

// ColorPicker - row of preset color swatches plus a custom color input
function ColorPicker({ value, onChange }) {
  return (
    <div className="color-picker">
      <div className="color-presets">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            className={`color-swatch${value === c ? " selected" : ""}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// Panel - a simple white box with a title used all over the app
function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

// ItemList - renders a list of items or an empty state message
function ItemList({ items, render, empty }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return <div className="item-list">{items.map((item) => <div key={item._id}>{render(item)}</div>)}</div>;
}

// courses page

// CoursesPage - add, edit, delete courses and set their weekly schedule
function CoursesPage({ courses, onSave, onDelete }) {
  const [form, setForm] = useState(blankCourse);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSave(form, editingId);
      setForm(blankCourse);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  // populate the form when editing an existing course
  function edit(course) {
    setEditingId(course._id);
    setForm({
      name: course.name,
      teacher: course.teacher || "",
      room: course.room || "",
      color: course.color,
      schedule: course.schedule || [],
    });
  }

  // add or remove a day from the course schedule
  function toggleDay(day) {
    const has = form.schedule.some((s) => s.day === day);
    if (has) {
      setForm({ ...form, schedule: form.schedule.filter((s) => s.day !== day) });
    } else {
      setForm({ ...form, schedule: [...form.schedule, { day, startTime: "08:00", endTime: "09:00" }] });
    }
  }

  // update start or end time for a specific day slot
  function updateSlot(day, field, value) {
    setForm({ ...form, schedule: form.schedule.map((s) => (s.day === day ? { ...s, [field]: value } : s)) });
  }

  // only show time pickers for days that are checked
  const activeDays = DAYS.filter((d) => form.schedule.some((s) => s.day === d));

  return (
    <CrudLayout
      title="Courses"
      intro="Create school courses and choose a custom color for each one."
      form={
        <form className="editor-form" onSubmit={submit}>
          <label>Course name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Teacher<input value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} /></label>
          <label>Room<input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></label>
          <label className="wide">Color<ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} /></label>
          <div className="wide schedule-builder">
            <p className="schedule-builder-label">Class schedule <span className="muted">(optional)</span></p>
            <div className="day-checks">
              {DAYS.map((day) => (
                <label key={day} className="day-check-label">
                  <input type="checkbox" checked={form.schedule.some((s) => s.day === day)} onChange={() => toggleDay(day)} />
                  {day}
                </label>
              ))}
            </div>
            {activeDays.map((day) => {
              const slot = form.schedule.find((s) => s.day === day);
              return (
                <div key={day} className="schedule-time-row">
                  <span className="schedule-day-tag">{day}</span>
                  <input type="time" value={slot.startTime} onChange={(e) => updateSlot(day, "startTime", e.target.value)} />
                  <span className="schedule-sep">–</span>
                  <input type="time" value={slot.endTime} onChange={(e) => updateSlot(day, "endTime", e.target.value)} />
                </div>
              );
            })}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button"><CirclePlus size={18} />{editingId ? "Update Course" : "Add Course"}</button>
        </form>
      }
    >
      {courses.map((course) => (
        <CourseCard key={course._id} course={course} onEdit={edit} onDelete={() => onDelete("courses", course._id)} />
      ))}
    </CrudLayout>
  );
}

// homework page

// HomeworkPage - add, edit, complete, and reorder assignments
// assignments are grouped by due date (overdue, today, tomorrow, this week, later)
// drag and drop reordering is saved to localStorage
function HomeworkPage({ courses, homework, onSave, onDelete, onToggle }) {
  const [filter, setFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("");
  const [form, setForm] = useState(blankHomework);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState(null);       // which card is being dragged
  const [dragOverId, setDragOverId] = useState(null); // which card is being hovered over

  // load saved order from localStorage so it persists across page refreshes
  const [hwOrder, setHwOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem("classkeeperHwOrder") || "[]"); }
    catch { return []; }
  });

  const tomorrow = offsetDayKey(1);
  const nextWeek = offsetDayKey(7);

  // sort items within a group according to the saved drag order
  function sortByOrder(items) {
    return [...items].sort((a, b) => {
      const ai = hwOrder.indexOf(a._id);
      const bi = hwOrder.indexOf(b._id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }

  // build the date groups for the homework list
  function getGroups() {
    const pool = courseFilter ? homework.filter((h) => h.course?._id === courseFilter) : homework;
    if (filter === "Completed") return [{ label: "Completed", items: sortByOrder(pool.filter((h) => h.completed)), tone: "success" }];
    if (filter === "Overdue") return [{ label: "Overdue", items: sortByOrder(pool.filter(isOverdue)), tone: "danger" }];
    const today = todayKey();
    const groups = [
      { label: "Overdue", items: sortByOrder(pool.filter((h) => isOverdue(h))), tone: "danger" },
      { label: "Today", items: sortByOrder(pool.filter((h) => !h.completed && normalizeDate(h.dueDate) === today)) },
      { label: "Tomorrow", items: sortByOrder(pool.filter((h) => !h.completed && normalizeDate(h.dueDate) === tomorrow)) },
      { label: "This Week", items: sortByOrder(pool.filter((h) => !h.completed && normalizeDate(h.dueDate) > tomorrow && normalizeDate(h.dueDate) <= nextWeek)) },
      { label: "Later", items: sortByOrder(pool.filter((h) => !h.completed && normalizeDate(h.dueDate) > nextWeek)) },
    ];
    if (filter === "All") groups.push({ label: "Completed", items: sortByOrder(pool.filter((h) => h.completed)), tone: "success" });
    return groups.filter((g) => g.items.length > 0);
  }

  // called when a card is dropped - reorders the saved ID list
  function handleDrop(targetId) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    setHwOrder((prev) => {
      const allIds = homework.map((h) => h._id);
      const order = [...prev];
      // make sure all IDs are in the order array even if not dragged yet
      allIds.forEach((id) => { if (!order.includes(id)) order.push(id); });
      const from = order.indexOf(dragId);
      const to = order.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      order.splice(from, 1);
      order.splice(to, 0, dragId);
      localStorage.setItem("classkeeperHwOrder", JSON.stringify(order));
      return order;
    });
    setDragId(null);
    setDragOverId(null);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSave(form, editingId);
      setForm(blankHomework);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  // populate the form when editing an existing homework item
  function edit(item) {
    setEditingId(item._id);
    setForm({
      title: item.title,
      description: item.description || "",
      dueDate: normalizeDate(item.dueDate),
      dueTime: item.dueTime || "",
      priority: item.priority,
      course: item.course?._id || "",
      color: item.color,
    });
  }

  const groups = getGroups();

  return (
    <CrudLayout
      title="Homework"
      intro="Manage assignments, priorities, deadlines, and completion status. Drag cards to reorder."
      form={
        <form className="editor-form" onSubmit={submit}>
          <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Course<select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}><option value="">No course</option>{courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
          <label>Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required /></label>
          <label>Due time <span className="label-optional">(optional)</span><input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} /></label>
          <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="wide">Color<ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} /></label>
          <label className="wide">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button"><CirclePlus size={18} />{editingId ? "Update Homework" : "Add Homework"}</button>
        </form>
      }
    >
      {/* filter pills by course */}
      {courses.length > 0 && (
        <div className="course-filter-row">
          <button className={!courseFilter ? "active" : ""} onClick={() => setCourseFilter("")}>All</button>
          {courses.map((c) => (
            <button
              key={c._id}
              className={`course-filter-pill${courseFilter === c._id ? " active" : ""}`}
              style={{ "--pill-color": c.color }}
              onClick={() => setCourseFilter(courseFilter === c._id ? "" : c._id)}
            >
              <span className="course-filter-dot" />{c.name}
            </button>
          ))}
        </div>
      )}

      {/* filter by status */}
      <div className="filters">{["All", "Active", "Completed", "Overdue"].map((name) => <button key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}</button>)}</div>

      {groups.length === 0 ? (
        <p className="muted">No homework here.</p>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <p className={`hw-group-label${group.tone ? ` ${group.tone}` : ""}`}>{group.label}</p>
            {group.items.map((item) => (
              <HomeworkCard
                key={item._id}
                item={item}
                onEdit={edit}
                onDelete={() => onDelete("homework", item._id)}
                onToggle={onToggle}
                isDragging={dragId === item._id}
                isDragOver={dragOverId === item._id}
                onDragStart={() => setDragId(item._id)}
                onDragOver={() => setDragOverId(item._id)}
                onDrop={() => handleDrop(item._id)}
                onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              />
            ))}
          </div>
        ))
      )}
    </CrudLayout>
  );
}

// events page

// EventsPage - add, edit, delete events like tests, activities, and reminders
function EventsPage({ events, onSave, onDelete }) {
  const [filter, setFilter] = useState("Upcoming");
  const [form, setForm] = useState(blankEvent);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const today = todayKey();

  // filter events by upcoming or past
  const filtered = events.filter((item) => {
    if (filter === "Upcoming") return normalizeDate(item.date) >= today;
    if (filter === "Past") return normalizeDate(item.date) < today;
    return true;
  });

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSave(form, editingId);
      setForm(blankEvent);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(item) {
    setEditingId(item._id);
    setForm({
      title: item.title,
      type: item.type,
      date: normalizeDate(item.date),
      time: item.time || "",
      location: item.location || "",
      notes: item.notes || "",
      color: item.color,
    });
  }

  return (
    <CrudLayout
      title="Activities & Events"
      intro="Track tests, reminders, practices, meetings, and school events."
      form={
        <form className="editor-form" onSubmit={submit}>
          <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{eventTypes.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
          <label>Time<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
          <label className="wide">Color<ColorPicker value={form.color} onChange={(c) => setForm({ ...form, color: c })} /></label>
          <label>Location<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label className="wide">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button"><CirclePlus size={18} />{editingId ? "Update Event" : "Add Event"}</button>
        </form>
      }
    >
      <div className="filters">
        {["All", "Upcoming", "Past"].map((name) => (
          <button key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}</button>
        ))}
      </div>
      {filtered.length === 0
        ? <p className="muted">No {filter.toLowerCase()} events.</p>
        : filtered.map((item) => <EventCard key={item._id} item={item} onEdit={edit} onDelete={() => onDelete("events", item._id)} />)
      }
    </CrudLayout>
  );
}

// schedule page

// SchedulePage - visual timetable showing all courses with their weekly schedule
// blocks are positioned using percentage-based top/height so they line up with the time labels
function SchedulePage({ courses }) {
  const START_HOUR = 7;  // timetable starts at 7am
  const END_HOUR = 21;   // timetable ends at 9pm
  const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  // converts a time string to a percentage down the timetable column
  function pct(time) {
    return ((timeToMinutes(time) - START_HOUR * 60) / TOTAL_MIN) * 100;
  }

  // calculates the height of a block as a percentage of the total column height
  function blockH(start, end) {
    return Math.max(((timeToMinutes(end) - timeToMinutes(start)) / TOTAL_MIN) * 100, 2);
  }

  // formats hour number to "7am", "12pm", "1pm" etc
  function fmtHour(h) {
    if (h === 12) return "12pm";
    return h > 12 ? `${h - 12}pm` : `${h}am`;
  }

  const coursesWithSchedule = courses.filter((c) => c.schedule && c.schedule.length > 0);

  return (
    <div className="panel">
      <h2>Weekly Schedule</h2>
      {coursesWithSchedule.length === 0 ? (
        <p className="muted">No scheduled classes yet. Open a course and add a class schedule to see it here.</p>
      ) : (
        <div className="timetable">
          {/* left column with hour labels */}
          <div className="timetable-times">
            {hours.map((h, i) => (
              <div key={h} className="timetable-hour-label" style={{ top: `${(i / (END_HOUR - START_HOUR)) * 100}%` }}>
                {fmtHour(h)}
              </div>
            ))}
          </div>
          {/* one column per weekday */}
          <div className="timetable-cols">
            {DAYS.map((day) => (
              <div key={day} className="timetable-col">
                <div className="timetable-day-label">{day}</div>
                <div className="timetable-col-body">
                  {/* render a block for each course that meets on this day */}
                  {courses.flatMap((c) =>
                    (c.schedule || [])
                      .filter((s) => s.day === day && s.startTime && s.endTime && timeToMinutes(s.startTime) < timeToMinutes(s.endTime))
                      .map((s, i) => (
                        <div
                          key={`${c._id}-${i}`}
                          className="timetable-block"
                          style={{ "--block-color": c.color, top: `${pct(s.startTime)}%`, height: `${blockH(s.startTime, s.endTime)}%` }}
                        >
                          <span className="timetable-block-name">{c.name}</span>
                          <span className="timetable-block-time">{s.startTime}–{s.endTime}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// pomodoro timer

// PomodoroPage - study timer with focus (25min), short break (5min), long break (15min)
// the SVG circle shrinks as time runs out
function PomodoroPage() {
  const [modeIdx, setModeIdx] = useState(0);  // which mode is active
  const [seconds, setSeconds] = useState(POMODORO_MODES[0].duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0); // how many focus sessions completed

  const mode = POMODORO_MODES[modeIdx];

  // reset the timer when switching modes
  useEffect(() => {
    setSeconds(mode.duration);
    setRunning(false);
  }, [modeIdx]);

  // countdown interval - cleans up when paused or component unmounts
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          if (modeIdx === 0) setSessions((n) => n + 1); // only count focus sessions
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, modeIdx]);

  function reset() { setRunning(false); setSeconds(mode.duration); }

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const progress = 1 - seconds / mode.duration; // 0 = full, 1 = empty
  const circumference = 2 * Math.PI * 44;       // circle with radius 44

  return (
    <div className="pomodoro-page">
      <section className="panel pomodoro-panel">
        <div className="filters pomodoro-modes">
          {POMODORO_MODES.map((m, i) => (
            <button key={m.label} className={modeIdx === i ? "active" : ""} onClick={() => setModeIdx(i)}>
              {m.label}
            </button>
          ))}
        </div>

        {/* SVG ring timer - the progress circle uses strokeDasharray to animate */}
        <div className="pomodoro-ring-wrap">
          <svg className="pomodoro-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" className="ring-track" />
            <circle
              cx="50" cy="50" r="44"
              className="ring-progress"
              strokeDasharray={`${circumference * progress} ${circumference}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="pomodoro-center">
            <span className="pomodoro-time">{mins}:{secs}</span>
            <span className="pomodoro-mode-label">{mode.label}</span>
          </div>
        </div>

        <div className="pomodoro-controls">
          <button className="primary-button" onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : seconds === mode.duration ? "Start" : "Resume"}
          </button>
          <button className="secondary-button" onClick={reset}>Reset</button>
        </div>

        <p className="pomodoro-sessions">Focus sessions completed: <strong>{sessions}</strong></p>
      </section>
    </div>
  );
}

// search overlay

// SearchOverlay - full screen search modal
// filters homework, courses, and events in real time as you type
// press Escape or click outside to close
function SearchOverlay({ homework, courses, events, onClose }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // filter results - useMemo so it only recalculates when query or data changes
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return {
      homework: homework.filter((h) => h.title.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q)).slice(0, 5),
      courses: courses.filter((c) => c.name.toLowerCase().includes(q) || c.teacher?.toLowerCase().includes(q)).slice(0, 4),
      events: events.filter((e) => e.title.toLowerCase().includes(q) || e.location?.toLowerCase().includes(q)).slice(0, 4),
    };
  }, [query, homework, courses, events]);

  const hasResults = results && (results.homework.length + results.courses.length + results.events.length > 0);

  // navigate to the right page and close the overlay
  function go(path) { navigate(path); onClose(); }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-box" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <Search size={18} className="search-icon-inline" />
          <input
            autoFocus
            className="search-input"
            placeholder="Search homework, courses, events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-esc" onClick={onClose}>Esc</button>
        </div>
        {results && (
          <div className="search-results">
            {results.homework.length > 0 && (
              <div className="search-section">
                <p className="search-section-label">Homework</p>
                {results.homework.map((h) => (
                  <button key={h._id} className="search-result-row" onClick={() => go("/homework")}>
                    <BookOpen size={15} />
                    <span>{h.title}</span>
                    <span className="search-meta">{formatDate(h.dueDate)}</span>
                  </button>
                ))}
              </div>
            )}
            {results.courses.length > 0 && (
              <div className="search-section">
                <p className="search-section-label">Courses</p>
                {results.courses.map((c) => (
                  <button key={c._id} className="search-result-row" onClick={() => go("/courses")}>
                    <span className="search-dot" style={{ background: c.color }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            )}
            {results.events.length > 0 && (
              <div className="search-section">
                <p className="search-section-label">Events</p>
                {results.events.map((e) => (
                  <button key={e._id} className="search-result-row" onClick={() => go("/events")}>
                    <CalendarDays size={15} />
                    <span>{e.title}</span>
                    <span className="search-meta">{formatDate(e.date)}</span>
                  </button>
                ))}
              </div>
            )}
            {!hasResults && <p className="search-empty">No results for "{query}"</p>}
          </div>
        )}
        {!query && <p className="search-hint">Start typing to search across all your data.</p>}
      </div>
    </div>
  );
}

// settings page

// SettingsPage - update profile, change password, toggle dark mode, import from Canvas
function SettingsPage({ api, user, onUpdate, theme, onImportDone }) {
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // canvas import state - URL is saved to localStorage so it persists
  const [canvasUrl, setCanvasUrl] = useState(() => localStorage.getItem("classkeeperCanvasUrl") || "");
  const [canvasToken, setCanvasToken] = useState("");
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [canvasResult, setCanvasResult] = useState(null);
  const [canvasError, setCanvasError] = useState("");

  // keep profile form in sync if the user object changes (e.g. after saving)
  useEffect(() => {
    setProfileForm({ name: user?.name || "", email: user?.email || "" });
  }, [user]);

  // save name and email
  async function submitProfile(e) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);
    try {
      const data = await api("/auth/profile", { method: "PATCH", body: JSON.stringify({ name: profileForm.name, email: profileForm.email }) });
      onUpdate(data);
      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  }

  // send Canvas URL and token to the server and trigger a data refresh when done
  async function submitCanvas(e) {
    e.preventDefault();
    setCanvasError("");
    setCanvasResult(null);
    setCanvasLoading(true);
    localStorage.setItem("classkeeperCanvasUrl", canvasUrl); // remember URL for next time
    try {
      const data = await api("/canvas/import", {
        method: "POST",
        body: JSON.stringify({ canvasUrl, canvasToken }),
      });
      setCanvasResult(data);
      setCanvasToken(""); // clear token from state after use
      onImportDone();     // refresh homework list
    } catch (err) {
      setCanvasError(err.message);
    } finally {
      setCanvasLoading(false);
    }
  }

  // change password - requires current password to verify identity
  async function submitPassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError("New passwords don't match."); return; }
    setPwLoading(true);
    try {
      const data = await api("/auth/profile", { method: "PATCH", body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
      onUpdate(data);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwSuccess("Password changed successfully.");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="settings-page">
      {/* dark / light mode toggle */}
      <section className="panel">
        <h2>Appearance</h2>
        <p className="muted">Choose your preferred color scheme.</p>
        <div className="theme-toggle-row">
          <span>{theme.dark ? "Dark mode" : "Light mode"}</span>
          <button className="theme-toggle" onClick={theme.toggle} aria-label="Toggle dark mode">
            {theme.dark ? <Sun size={18} /> : <Moon size={18} />}
            {theme.dark ? "Switch to Light" : "Switch to Dark"}
          </button>
        </div>
      </section>

      {/* canvas assignment import */}
      <section className="panel">
        <h2>Import from Canvas</h2>
        <p className="muted">Paste your school's Canvas URL and a personal access token to pull in your upcoming assignments automatically.</p>
        <p className="canvas-help">
          To get a token: Canvas → <strong>Account</strong> → <strong>Settings</strong> → scroll to <strong>Approved Integrations</strong> → <strong>New Access Token</strong>.
        </p>
        <form className="stacked-form" onSubmit={submitCanvas}>
          <label>
            Canvas URL
            <input
              placeholder="https://yourschool.instructure.com"
              value={canvasUrl}
              onChange={(e) => setCanvasUrl(e.target.value)}
              required
            />
          </label>
          <label>
            Access token
            <input
              type="password"
              placeholder="Paste your Canvas token here"
              value={canvasToken}
              onChange={(e) => setCanvasToken(e.target.value)}
              required
            />
          </label>
          {canvasError && <p className="form-error">{canvasError}</p>}
          {canvasResult && (
            <p className="form-success">
              Imported <strong>{canvasResult.imported}</strong> assignment{canvasResult.imported !== 1 ? "s" : ""}
              {canvasResult.skipped > 0 ? ` · ${canvasResult.skipped} already existed` : ""}.
            </p>
          )}
          <button className="primary-button" disabled={canvasLoading}>
            {canvasLoading ? "Importing…" : "Import Assignments"}
          </button>
        </form>
      </section>

      {/* update name and email */}
      <section className="panel">
        <h2>Your Profile</h2>
        <p className="muted">Update your display name and email address.</p>
        <form className="stacked-form" onSubmit={submitProfile}>
          <label>Name<input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required /></label>
          <label>Email<input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required /></label>
          {profileError && <p className="form-error">{profileError}</p>}
          {profileSuccess && <p className="form-success">{profileSuccess}</p>}
          <button className="primary-button" disabled={profileLoading}>{profileLoading ? "Saving…" : "Save Profile"}</button>
        </form>
      </section>

      {/* change password */}
      <section className="panel">
        <h2>Change Password</h2>
        <p className="muted">Enter your current password and choose a new one (min. 6 characters).</p>
        <form className="stacked-form" onSubmit={submitPassword}>
          <label>Current password<input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required /></label>
          <label>New password<input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} minLength={6} required /></label>
          <label>Confirm new password<input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required /></label>
          {pwError && <p className="form-error">{pwError}</p>}
          {pwSuccess && <p className="form-success">{pwSuccess}</p>}
          <button className="primary-button" disabled={pwLoading}>{pwLoading ? "Saving…" : "Change Password"}</button>
        </form>
      </section>
    </div>
  );
}

// shared components

// CrudLayout - two column layout used by homework, courses, and events pages
// left side has the form, right side has the list of saved items
function CrudLayout({ title, intro, form, children }) {
  return (
    <div className="crud-grid">
      <section className="panel editor">
        <h2>{title}</h2>
        <p className="muted">{intro}</p>
        {form}
      </section>
      <section className="panel">
        <h2>Saved Items</h2>
        <div className="item-list">{children || <p className="muted">Nothing saved yet.</p>}</div>
      </section>
    </div>
  );
}

// CoursePill - small colored pill showing a course name (used on the dashboard)
function CoursePill({ course }) {
  return <span className="course-pill" style={{ "--item-color": course.color }}>{course.name}</span>;
}

// CourseCard - card showing course name, teacher, room, and schedule
function CourseCard({ course, onEdit, onDelete }) {
  const scheduleStr = course.schedule?.length > 0
    ? course.schedule.map((s) => `${s.day} ${s.startTime}–${s.endTime}`).join("  ·  ")
    : null;
  return (
    <article className="item-card" style={{ "--item-color": course.color }}>
      <div>
        <h3>{course.name}</h3>
        <p>{[course.teacher, course.room].filter(Boolean).join(" • ") || "No details yet"}</p>
        {scheduleStr && <p className="notes">{scheduleStr}</p>}
      </div>
      <CardActions onEdit={() => onEdit(course)} onDelete={onDelete} />
    </article>
  );
}

// PriorityBadge - colored pill showing Low / Medium / High
function PriorityBadge({ priority }) {
  return <span className={`priority-badge ${priority.toLowerCase()}`}>{priority}</span>;
}

// HomeworkCard - shows a single assignment with drag support
// compact mode is used on the dashboard (no actions, no drag handle)
function HomeworkCard({ item, onEdit, onDelete, onToggle, compact = false, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  return (
    <article
      className={`item-card${item.completed ? " completed" : ""}${isDragging ? " dragging" : ""}${isDragOver ? " drag-over" : ""}`}
      style={{ "--item-color": item.color }}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
      onDragEnd={onDragEnd}
    >
      {/* drag handle only shows in full (non-compact) mode */}
      {!compact && onDragStart && (
        <div className="drag-handle"><GripVertical size={16} /></div>
      )}
      <div>
        <div className="card-heading">
          <h3>{item.title}</h3>
          <PriorityBadge priority={item.priority} />
          {isOverdue(item) && <span className="status danger">Overdue</span>}
          {item.completed && <span className="status success">Done</span>}
        </div>
        {/* show ClassKeeper course name, Canvas course name, or "Homework" as fallback */}
        <p>{item.course?.name || item.canvasCourseName || "Homework"} • Due {formatDate(item.dueDate)}{item.dueTime ? ` at ${formatTime(item.dueTime)}` : ""}</p>
        {!compact && item.description && <p className="notes">{item.description}</p>}
      </div>
      {!compact && (
        <div className="card-actions">
          <button title="Mark complete" onClick={() => onToggle(item)}><CheckCircle2 size={17} /></button>
          <button title="Edit" onClick={() => onEdit(item)}><Pencil size={17} /></button>
          <button title="Delete" onClick={onDelete}><Trash2 size={17} /></button>
        </div>
      )}
    </article>
  );
}

// EventCard - shows a single event with a date block on the left
function EventCard({ item, onEdit, onDelete, compact = false }) {
  const d = new Date(item.date);
  // use UTC methods so the date doesnt shift due to timezone
  const monthStr = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleString("default", { month: "short" });
  const dayNum = d.getUTCDate();
  return (
    <article className={`item-card${compact ? "" : " event-card"}`} style={{ "--item-color": item.color }}>
      {!compact && (
        <div className="event-date-block">
          <span className="event-month">{monthStr}</span>
          <span className="event-day">{dayNum}</span>
        </div>
      )}
      <div className="event-content">
        <div className="card-heading">
          <span className="event-type-icon">{eventTypeIcon(item.type)}</span>
          <h3>{item.title}</h3>
          <span className="status">{item.type}</span>
        </div>
        <p>
          {item.time || ""}
          {item.time && item.location ? " · " : ""}
          {item.location || ""}
          {!item.time && !item.location && formatDate(item.date)}
        </p>
        {!compact && item.notes && <p className="notes">{item.notes}</p>}
      </div>
      {!compact && <CardActions onEdit={() => onEdit(item)} onDelete={onDelete} />}
    </article>
  );
}

// CardActions - edit and delete buttons used on course and event cards
function CardActions({ onEdit, onDelete }) {
  return (
    <div className="card-actions">
      <button title="Edit" onClick={onEdit}><Pencil size={17} /></button>
      <button title="Delete" onClick={onDelete}><Trash2 size={17} /></button>
    </div>
  );
}

export default App;
