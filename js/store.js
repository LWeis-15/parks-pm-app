// App-level store: seeds the DB on first run, caches everything in memory for
// synchronous rendering, and is the single place that mutates data. Screens
// call actions here; nothing talks to db.js directly except this module.
import * as db from './db.js';
import {
  TASKS, ASSETS, USERS, PARK, PRESEEDED_CLOSURES, STATE_POOL_CODE_RANGES,
} from './seed.js';
import { computeTaskStatus, isSameLocalDay } from './calc.js';

export const ROUTE_CATEGORY_ORDER = [
  'Wastewater/Septic', 'Pools/Splash Pads', 'Buildings', 'Playgrounds',
  'Grounds', 'Roads/Parking', 'Equipment/Vehicles',
];

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach((fn) => fn(state)); }

export const state = {
  tasks: [], assets: [], closures: [], workOrders: [], users: [], session: null,
  ready: false,
};

function todayKeyOf(d = new Date()) { return d.toISOString().slice(0, 10); }

async function seedIfEmpty() {
  const existing = await db.count('tasks');
  if (existing > 0) return;
  for (const t of TASKS) await db.put('tasks', { ...t, appliesToPark: t.appliesToPark !== false });
  for (const a of ASSETS) await db.put('assets', a);
  for (const u of USERS) await db.put('users', u);
  await db.put('session', {
    key: 'current', actingUserId: 'u_marcus', persona: 'tech',
    parkCode: PARK.code, parkName: PARK.name, parkState: PARK.state,
    lastSyncAt: (() => { const d = new Date(); d.setHours(6, 58, 0, 0); return d.toISOString(); })(),
    forceOffline: false,
  });
  // Pre-seed the three closures already done before the tech opens the app.
  for (const c of PRESEEDED_CLOSURES) {
    const when = new Date(Date.now() - c.hoursAgo * 3600 * 1000).toISOString();
    const task = TASKS.find((t) => t.id === c.taskId);
    const closure = {
      taskId: c.taskId, assetId: task.assetId || null, completedAt: when,
      completedByUserId: 'u_marcus', completedByName: 'Marcus Ellery',
      readings: [], photoIds: [], note: c.note || '', outcome: c.outcome,
      gps: true, syncState: 'queued', parkCode: PARK.code, dateKey: todayKeyOf(new Date(when)),
      retryCount: 0,
    };
    const id = await db.add('closures', closure);
    await db.add('syncQueue', { refType: 'closure', refId: id, retryCount: 0, lastError: null, queuedAt: when });
    await db.put('tasks', { ...task, lastCompleted: when });
  }
}

export async function init() {
  await seedIfEmpty();
  await refreshAll();
  window.addEventListener('online', () => notify());
  window.addEventListener('offline', () => notify());
  state.ready = true;
  notify();
}

export async function refreshAll() {
  const [tasks, assets, closures, workOrders, users, session] = await Promise.all([
    db.getAll('tasks'), db.getAll('assets'), db.getAll('closures'),
    db.getAll('workOrders'), db.getAll('users'), db.get('session', 'current'),
  ]);
  state.tasks = tasks.sort((a, b) => a.id - b.id);
  state.assets = assets;
  state.closures = closures.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  state.workOrders = workOrders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  state.users = users;
  state.session = session;
}

export function isOnline() {
  return navigator.onLine && !(state.session && state.session.forceOffline);
}

export async function toggleForceOffline() {
  state.session.forceOffline = !state.session.forceOffline;
  await db.put('session', state.session);
  notify();
}

export function getTask(id) { return state.tasks.find((t) => t.id === Number(id)); }
export function getAsset(id) { return state.assets.find((a) => a.id === id); }
export function getUser(id) { return state.users.find((u) => u.id === id); }
export function actingUser() { return getUser(state.session.actingUserId); }

export function closuresForTask(taskId) {
  return state.closures.filter((c) => c.taskId === Number(taskId));
}
export function lastClosureForTask(taskId) {
  return closuresForTask(taskId)[0] || null;
}
export function queuedClosures() {
  return state.closures.filter((c) => c.syncState === 'queued' || c.syncState === 'error');
}
export function workOrdersForAsset(assetId) {
  return state.workOrders.filter((w) => w.assetId === assetId);
}
export function tasksForAsset(assetId) {
  return state.tasks.filter((t) => t.assetId === assetId);
}
export function poolCodeRange() {
  return STATE_POOL_CODE_RANGES[state.session.parkState] || STATE_POOL_CODE_RANGES.VA;
}

export async function changeActingUser(userId) {
  state.session.actingUserId = userId;
  await db.put('session', state.session);
  notify();
}
export async function setPersona(persona) {
  state.session.persona = persona;
  await db.put('session', state.session);
  notify();
}

// ---------------------------------------------------------------- photos --
const photoUrlCache = new Map();
export async function addPhotoBlob(blob) {
  const id = await db.add('photos', { blob, createdAt: new Date().toISOString() });
  return id;
}
export async function photoUrl(id) {
  if (photoUrlCache.has(id)) return photoUrlCache.get(id);
  const rec = await db.get('photos', id);
  if (!rec) return null;
  const url = URL.createObjectURL(rec.blob);
  photoUrlCache.set(id, url);
  return url;
}

// ---------------------------------------------------------- closing tasks --
async function pushToQueue(closureId) {
  await db.add('syncQueue', { refType: 'closure', refId: closureId, retryCount: 0, lastError: null, queuedAt: new Date().toISOString() });
}

export async function closeTask({ taskId, readings = [], photoIds = [], note = '', outcome = 'pass' }) {
  const task = getTask(taskId);
  const now = new Date().toISOString();
  const closure = {
    taskId: Number(taskId), assetId: task.assetId || null, completedAt: now,
    completedByUserId: state.session.actingUserId, completedByName: actingUser()?.name || 'Unknown',
    readings, photoIds, note, outcome, gps: true, syncState: 'queued',
    parkCode: state.session.parkCode, dateKey: todayKeyOf(), retryCount: 0,
  };
  const prevLastCompleted = task.lastCompleted || null;
  const closureId = await db.add('closures', closure);
  await pushToQueue(closureId);
  await db.put('tasks', { ...task, lastCompleted: now });

  let workOrder = null;
  const outOfRange = readings.some((r) => r.inRange === false);
  if (outOfRange && outcome === 'pass') {
    workOrder = await createWorkOrder({
      sourceClosureId: closureId, assetId: task.assetId, taskId: task.id,
      title: `Retest out-of-range reading — ${task.task}`,
      ownerId: state.session.actingUserId, ownerName: actingUser()?.name,
      dueHours: 4, priority: 'routine', notifyRoles: [],
    });
  }

  await refreshAll();
  notify();
  return { closureId, prevLastCompleted, workOrder };
}

export async function undoClose({ closureId, prevLastCompleted, taskId, workOrder }) {
  await db.del('closures', closureId);
  const all = await db.getAll('syncQueue');
  const entry = all.find((q) => q.refType === 'closure' && q.refId === closureId);
  if (entry) await db.del('syncQueue', entry.id);
  if (workOrder) await db.del('workOrders', workOrder.id);
  const task = getTask(taskId);
  await db.put('tasks', { ...task, lastCompleted: prevLastCompleted });
  await refreshAll();
  notify();
}

export async function closeTaskFailed({ taskId, failedCriteria, outOfServiceNote, photoIds = [], workOrderDraft, notifyGmRom }) {
  const task = getTask(taskId);
  const now = new Date().toISOString();
  const closure = {
    taskId: Number(taskId), assetId: task.assetId || null, completedAt: now,
    completedByUserId: state.session.actingUserId, completedByName: actingUser()?.name || 'Unknown',
    readings: [], photoIds, note: [outOfServiceNote, failedCriteria.join('; ')].filter(Boolean).join(' — '),
    outcome: 'fail', gps: true, syncState: 'queued',
    parkCode: state.session.parkCode, dateKey: todayKeyOf(), retryCount: 0,
  };
  const closureId = await db.add('closures', closure);
  await pushToQueue(closureId);
  await db.put('tasks', { ...task, lastCompleted: now });

  const workOrder = await createWorkOrder({
    sourceClosureId: closureId, assetId: task.assetId, taskId: task.id,
    title: workOrderDraft.title, ownerId: workOrderDraft.ownerId, ownerName: workOrderDraft.ownerName,
    dueDate: workOrderDraft.dueDate, priority: workOrderDraft.priority,
    notifyRoles: notifyGmRom ? ['GM', 'ROM'] : [], photoIds,
  });

  await refreshAll();
  notify();
  return { closureId, workOrder };
}

export async function createWorkOrder({ sourceClosureId = null, assetId, taskId, title, ownerId, ownerName, dueDate, dueHours, priority, notifyRoles = [], photoIds = [] }) {
  const due = dueDate || new Date(Date.now() + (dueHours || 336) * 3600 * 1000).toISOString();
  const wo = {
    sourceClosureId, assetId, taskId, title, ownerId, ownerName, dueDate: due,
    priority: priority || 'routine', status: 'open', photoIds, notifyRoles,
    parkCode: state.session.parkCode, createdAt: new Date().toISOString(),
  };
  const id = await db.add('workOrders', wo);
  return { ...wo, id };
}

export async function resolveWorkOrder(id, status = 'closed') {
  const wo = state.workOrders.find((w) => w.id === id);
  if (!wo) return;
  await db.put('workOrders', { ...wo, status });
  await refreshAll();
  notify();
}

export async function markNA(taskId) {
  const task = getTask(taskId);
  await db.put('tasks', { ...task, appliesToPark: false });
  await refreshAll();
  notify();
}

export async function syncNow() {
  const queued = queuedClosures();
  for (const c of queued) {
    await db.put('closures', { ...c, syncState: 'synced' });
  }
  state.session.lastSyncAt = new Date().toISOString();
  await db.put('session', state.session);
  await refreshAll();
  notify();
  return queued.length;
}
