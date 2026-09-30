const CONFIG_KEY = "pencilstudio-sheets-config";
const DEMO_TASKS_KEY = "pencilstudio-demo-tasks";
const VALID_STATUSES = ["Pending", "In Progress", "Completed"];
const VALID_PRIORITIES = ["Low", "Medium", "High"];

const demoSeed = [
  { id: "demo-1", task: "Review normalization", subject: "DBMS", status: "In Progress", priority: "High", dueDate: "2026-10-05" },
  { id: "demo-2", task: "Build flashcards", subject: "Data Structures", status: "Pending", priority: "Medium", dueDate: "2026-10-08" },
  { id: "demo-3", task: "Submit lab report", subject: "Operating Systems", status: "Completed", priority: "Low", dueDate: "2026-10-02" },
];

/*
  Apps Script contract:
  GET  <WEB_APP_URL>?action=list
  POST { action: "create", data: task }
  POST { action: "update", id: "1", data: task }
  POST { action: "delete", id: "1" }
  Expected response: { success: true, message: "...", data: {} | [] }
*/

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function normalizeTask(task = {}) {
  const status = VALID_STATUSES.includes(task.status) ? task.status : "Pending";
  const priority = VALID_PRIORITIES.includes(task.priority) ? task.priority : "Medium";
  return {
    id: String(task.id ?? `demo-${Date.now()}`),
    task: String(task.task ?? "").trim(),
    subject: String(task.subject ?? "").trim(),
    status,
    priority,
    dueDate: String(task.dueDate ?? "").trim(),
  };
}

export function getSheetsConfig() {
  if (!hasStorage()) return { url: "" };
  try {
    return { url: String(JSON.parse(window.localStorage.getItem(CONFIG_KEY) || "{}").url || "").trim() };
  } catch {
    return { url: "" };
  }
}

export function saveSheetsConfig(url) {
  const normalizedUrl = String(url || "").trim();
  if (hasStorage()) window.localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: normalizedUrl }));
  return { url: normalizedUrl };
}

function readDemoTasks() {
  if (!hasStorage()) return demoSeed.map(normalizeTask);
  try {
    const stored = JSON.parse(window.localStorage.getItem(DEMO_TASKS_KEY) || "null");
    return Array.isArray(stored) ? stored.map(normalizeTask) : demoSeed.map(normalizeTask);
  } catch {
    return demoSeed.map(normalizeTask);
  }
}

function writeDemoTasks(tasks) {
  if (hasStorage()) window.localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(tasks.map(normalizeTask)));
  return tasks.map(normalizeTask);
}

async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    return { success: false, data: [], message: "The Sheets endpoint could not be reached." };
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    return { success: false, data: [], message: "The Sheets endpoint returned invalid JSON." };
  }
  if (!response.ok) return { success: false, data: [], message: payload?.message || `The Sheets endpoint returned ${response.status}.` };
  if (payload?.success !== true) return { success: false, data: [], message: payload?.message || "The Sheets endpoint reported an error." };
  return { success: true, data: payload.data ?? [], message: payload.message || "Data updated." };
}

export async function listTasks() {
  const { url } = getSheetsConfig();
  if (!url) return { success: true, data: readDemoTasks(), message: "Demo data loaded.", mode: "demo" };
  const result = await request(`${url}${url.includes("?") ? "&" : "?"}action=list`);
  return { ...result, data: Array.isArray(result.data) ? result.data.map(normalizeTask) : [], mode: "sheets" };
}

export async function createTask(task) {
  const { url } = getSheetsConfig();
  const normalized = normalizeTask(task);
  if (!url) {
    const tasks = [...readDemoTasks(), { ...normalized, id: `demo-${Date.now()}` }];
    return { success: true, data: writeDemoTasks(tasks), message: "Task saved in demo mode.", mode: "demo" };
  }
  const result = await request(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "create", data: normalized }) });
  return { ...result, mode: "sheets" };
}

export async function updateTask(id, task) {
  const { url } = getSheetsConfig();
  const normalized = normalizeTask({ ...task, id });
  if (!url) {
    const tasks = readDemoTasks().map((item) => item.id === String(id) ? normalized : item);
    return { success: true, data: writeDemoTasks(tasks), message: "Task updated in demo mode.", mode: "demo" };
  }
  const result = await request(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "update", id: String(id), data: normalized }) });
  return { ...result, mode: "sheets" };
}

export async function deleteTask(id) {
  const { url } = getSheetsConfig();
  if (!url) {
    return { success: true, data: writeDemoTasks(readDemoTasks().filter((item) => item.id !== String(id))), message: "Task deleted in demo mode.", mode: "demo" };
  }
  const result = await request(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "delete", id: String(id) }) });
  return { ...result, mode: "sheets" };
}

export async function testConnection() {
  const { url } = getSheetsConfig();
  if (!url) return { success: false, configured: false, message: "NO SHEETS URL CONFIGURED" };
  const result = await request(`${url}${url.includes("?") ? "&" : "?"}action=health`);
  return { ...result, configured: true, success: result.success, message: result.success ? "CONNECTED ✓" : "CONNECTION FAILED" };
}