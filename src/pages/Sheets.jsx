import { useEffect, useMemo, useState } from "react";

import { createTask, deleteTask, getSheetsConfig, listTasks, normalizeTask, saveSheetsConfig, testConnection, updateTask } from "../services/googleSheets";

const emptyTask = { task: "", subject: "", status: "Pending", priority: "Medium", dueDate: "" };

function SheetsStatus({ status, mode, message }) {
  const label = mode === "demo" ? "DEMO MODE" : status === "connected" ? "CONNECTED" : status === "connecting" ? "CONNECTING" : status === "refreshing" ? "REFRESHING" : status === "error" ? "ERROR" : "NOT CONFIGURED";
  return <div className={`sheets-status sheets-status-${status}`} aria-live="polite"><span className="sheets-status-mark" aria-hidden="true" /><span>DATA SOURCE:</span><strong>{label}</strong>{message && <span className="sheets-status-message">{message}</span>}</div>;
}

function TaskForm({ task, editing, saving, onChange, onSubmit, onCancel }) {
  return <form className="sheets-task-form" onSubmit={onSubmit}>
    <div className="sheets-form-heading"><strong>{editing ? "Edit Task" : "Add Task"}</strong><span>{editing ? "adjust the row" : "add a new row to the desk"}</span></div>
    <div className="sheets-task-fields"><label>Task<input name="task" value={task.task} onChange={onChange} placeholder="e.g. Review normalization" required /></label><label>Subject<input name="subject" value={task.subject} onChange={onChange} placeholder="e.g. DBMS" required /></label><label>Status<select name="status" value={task.status} onChange={onChange}><option>Pending</option><option>In Progress</option><option>Completed</option></select></label><label>Priority<select name="priority" value={task.priority} onChange={onChange}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Due Date<input type="date" name="dueDate" value={task.dueDate} onChange={onChange} /></label></div>
    <div className="sheets-form-actions"><button type="submit" className="sheets-primary-button" disabled={saving}>{saving ? "Saving..." : editing ? "Update Task" : "Save Task"}</button><button type="button" className="sheets-secondary-button" onClick={onCancel}>Cancel</button></div>
  </form>;
}

function TaskRow({ task, deleting, onEdit, onDelete, onKeep }) {
  return <tr>
    <td data-label="Task"><strong>{task.task}</strong></td><td data-label="Subject">{task.subject}</td><td data-label="Status"><span className={`task-status task-status-${task.status.toLowerCase().replace(/\s+/g, "-")}`}>{task.status}</span></td><td data-label="Priority"><span className="task-priority">{task.priority}</span></td><td data-label="Due">{task.dueDate || "—"}</td><td data-label="Actions"><div className="task-actions">{deleting ? <><span className="delete-question">Delete this task?</span><button type="button" onClick={onDelete}>Delete</button><button type="button" onClick={onKeep}>Keep</button></> : <><button type="button" onClick={onEdit}>Edit</button><button type="button" onClick={onDelete}>Delete</button></>}</div></td>
  </tr>;
}

export default function Sheets() {
  const [configUrl, setConfigUrl] = useState(() => getSheetsConfig().url);
  const [tasks, setTasks] = useState([]);
  const [mode, setMode] = useState(configUrl ? "sheets" : "demo");
  const [connectionStatus, setConnectionStatus] = useState(configUrl ? "connecting" : "not-configured");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formTask, setFormTask] = useState(emptyTask);
  const [deletingId, setDeletingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadTasks = async (reason = "refresh") => {
    const configured = Boolean(getSheetsConfig().url);
    setMode(configured ? "sheets" : "demo");
    setConnectionStatus(configured ? (reason === "refresh" ? "refreshing" : "connecting") : "not-configured");
    setBusy(true);
    const result = await listTasks();
    if (result.success) {
      setTasks(result.data.map(normalizeTask));
      setMode(result.mode);
      setConnectionStatus(result.mode === "sheets" ? "connected" : "not-configured");
      setMessage(reason === "refresh" ? "DATA UPDATED" : "");
    } else {
      setConnectionStatus("error");
      setMessage(result.message);
    }
    setBusy(false);
  };

  useEffect(() => { loadTasks("initial"); }, []);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const query = search.toLowerCase().trim();
    return (!query || task.task.toLowerCase().includes(query) || task.subject.toLowerCase().includes(query)) && (statusFilter === "All" || task.status === statusFilter) && (priorityFilter === "All" || task.priority === priorityFilter);
  }), [tasks, search, statusFilter, priorityFilter]);

  const saveUrl = async (event) => {
    event.preventDefault();
    saveSheetsConfig(configUrl);
    setMessage("");
    await loadTasks("connect");
  };

  const test = async () => {
    saveSheetsConfig(configUrl);
    setConnectionStatus("connecting");
    const result = await testConnection();
    if (result.success) { setMode("sheets"); setConnectionStatus("connected"); setMessage("CONNECTED ✓"); }
    else { setConnectionStatus(result.configured ? "error" : "not-configured"); setMessage(result.message); }
  };

  const openCreate = () => { setEditingId(null); setFormTask(emptyTask); setShowForm(true); };
  const openEdit = (task) => { setEditingId(task.id); setFormTask(normalizeTask(task)); setShowForm(true); setDeletingId(null); };
  const changeForm = (event) => setFormTask((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const submitForm = async (event) => {
    event.preventDefault();
    setBusy(true); setConnectionStatus(mode === "demo" ? "not-configured" : "connected"); setMessage("");
    const result = editingId ? await updateTask(editingId, formTask) : await createTask(formTask);
    if (result.success) { setShowForm(false); setEditingId(null); setFormTask(emptyTask); setMessage(editingId ? "TASK UPDATED" : "TASK SAVED"); await loadTasks("refresh"); }
    else { setConnectionStatus("error"); setMessage(result.message); setBusy(false); }
  };
  const remove = async (id) => { setBusy(true); const result = await deleteTask(id); if (result.success) { setDeletingId(null); setMessage("TASK DELETED"); await loadTasks("refresh"); } else { setConnectionStatus("error"); setMessage(result.message); setBusy(false); } };

  return <div className="page sheets-page">
    <header className="sheets-header"><div className="sheets-kicker"><span>05</span><span>/</span><span>GOOGLE SHEETS DATA DESK</span></div><h1 className="hand">LET THE SHEET HOLD THE DATA.</h1><p>A live student task board powered by Google Sheets and a dynamic React interface.</p></header>
    <div className="sheets-flow"><span>REACT</span><b>→</b><span>WEB APP</span><b>→</b><span>SHEETS</span></div>
    <section className="sheets-config-panel"><div className="sheets-panel-heading"><strong>Connection Desk</strong><SheetsStatus status={connectionStatus} mode={mode} message={message} /></div><form className="sheets-config-form" onSubmit={saveUrl}><label>Apps Script Web App URL<input value={configUrl} onChange={(event) => setConfigUrl(event.target.value)} placeholder="https://script.google.com/macros/s/..." type="url" /></label><div className="sheets-dataset"><span>Sheet / Dataset</span><strong>STUDENT TASKS</strong></div><div className="sheets-config-actions"><button type="submit" className="sheets-primary-button">Save Connection</button><button type="button" className="sheets-secondary-button" onClick={test}>Test Connection</button><small>{mode === "demo" ? "No URL configured. Local demo data is active." : "Remote data mode. Records are read from Apps Script."}</small></div></form></section>
    <section className="sheets-board"><div className="sheets-board-heading"><div><span className="sheets-annotation">01 / STUDENT TASKS</span><h2>THE TASK SHEET.</h2></div><div className="sheets-board-actions"><button type="button" onClick={() => loadTasks("refresh")} disabled={busy}>{busy ? "Refreshing..." : "Refresh Data"}</button><button type="button" className="sheets-primary-button" onClick={openCreate}>+ Add Task</button></div></div>
      <div className="sheets-filters"><label>Search tasks<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SEARCH TASKS..." /></label><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Pending</option><option>In Progress</option><option>Completed</option></select></label><label>Priority<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All</option><option>Low</option><option>Medium</option><option>High</option></select></label></div>
      {showForm && <TaskForm task={formTask} editing={Boolean(editingId)} saving={busy} onChange={changeForm} onSubmit={submitForm} onCancel={() => { setShowForm(false); setEditingId(null); }} />}
      <div className="sheets-table-wrap"><table className="sheets-table"><thead><tr><th>Task</th><th>Subject</th><th>Status</th><th>Priority</th><th>Due</th><th>Actions</th></tr></thead><tbody>{filteredTasks.length ? filteredTasks.map((task) => <TaskRow key={task.id} task={task} deleting={deletingId === task.id} onEdit={() => openEdit(task)} onDelete={() => setDeletingId(task.id)} onKeep={() => setDeletingId(null)} />) : <tr><td colSpan="6" className="sheets-empty-row">{busy ? "LOADING THE SHEET..." : "NO TASKS MATCH THIS VIEW."}</td></tr>}</tbody></table></div>
      <div className="sheets-board-footer"><span>{filteredTasks.length} visible / {tasks.length} total</span><span>{mode === "demo" ? "LOCAL STORAGE DEMO" : "APPS SCRIPT REMOTE"}</span></div>
    </section>
  </div>;
}
