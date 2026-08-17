// Derived-state engine. Nothing here is stored — status, compliance %, and
// service-life % are recomputed from tasks/assets/closures every render, per
// README "State Management: Derived, never stored."
import { FREQUENCY_INTERVAL_DAYS } from './seed.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function isSameLocalDay(iso, ref = new Date()) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

function monthDay(d) { return d.getMonth() * 100 + d.getDate(); }
function nextOccurrence(ref, month, day) {
  const y = ref.getFullYear();
  let candidate = new Date(y, month, day);
  if (candidate < ref) candidate = new Date(y + 1, month, day);
  return candidate;
}

// Season windows (month is 0-indexed). Returns { dormant, returnDate }.
// Growing Season shares the Summer Only window per the dormant-shelf copy in
// the source design ("...4 Growing Season grounds tasks ... Apr 15").
export function seasonWindow(season, ref = new Date()) {
  const md = monthDay(ref);
  const APR15 = 3 * 100 + 15, OCT15 = 9 * 100 + 15;
  const MAR1 = 2 * 100 + 1, MAY31 = 4 * 100 + 31;
  const SEP1 = 8 * 100 + 1, NOV30 = 10 * 100 + 30;

  switch (season) {
    case 'Summer Only':
    case 'Growing Season':
      if (md < APR15 || md > OCT15) return { dormant: true, returnDate: nextOccurrence(ref, 3, 15) };
      return { dormant: false, returnDate: null };
    case 'Off-Season':
      if (md >= APR15 && md <= OCT15) return { dormant: true, returnDate: nextOccurrence(ref, 9, 16) };
      return { dormant: false, returnDate: null };
    case 'Spring':
      if (md < MAR1 || md > MAY31) return { dormant: true, returnDate: nextOccurrence(ref, 2, 1) };
      return { dormant: false, returnDate: null };
    case 'Fall':
      if (md < SEP1 || md > NOV30) return { dormant: true, returnDate: nextOccurrence(ref, 8, 1) };
      return { dormant: false, returnDate: null };
    case 'Spring/Fall': {
      const inSpring = md >= MAR1 && md <= MAY31;
      const inFall = md >= SEP1 && md <= NOV30;
      if (inSpring || inFall) return { dormant: false, returnDate: null };
      const toSpring = nextOccurrence(ref, 2, 1);
      const toFall = nextOccurrence(ref, 8, 1);
      return { dormant: true, returnDate: toSpring < toFall ? toSpring : toFall };
    }
    case 'Year-Round':
    default:
      return { dormant: false, returnDate: null };
  }
}

// task: { frequency, lastCompleted, scheduledDate, season, appliesToPark }
export function computeTaskStatus(task, ref = new Date()) {
  if (task.appliesToPark === false) {
    return { status: 'na', label: 'N/A', nextDue: null, doneToday: false };
  }
  const { dormant, returnDate } = seasonWindow(task.season, ref);
  if (dormant) {
    return { status: 'dormant', label: 'DORMANT', nextDue: null, returnDate, doneToday: false };
  }

  const doneToday = isSameLocalDay(task.lastCompleted, ref);

  let nextDue = null;
  if (task.scheduledDate) {
    nextDue = new Date(task.scheduledDate);
  } else if (task.lastCompleted) {
    const interval = FREQUENCY_INTERVAL_DAYS[task.frequency] || 1;
    nextDue = new Date(new Date(task.lastCompleted).getTime() + interval * DAY_MS);
  }

  if (!task.lastCompleted && !task.scheduledDate) {
    return { status: 'not-started', label: 'NOT STARTED', nextDue: null, doneToday: false };
  }

  // Compare calendar days, not exact timestamps — a task due "today" (e.g.
  // completed yesterday morning, due this morning) must read as due today,
  // not overdue, regardless of what time it is right now.
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysUntilDue = nextDue ? Math.round((dayStart(nextDue) - dayStart(ref)) / DAY_MS) : null;

  if (doneToday) {
    return { status: 'done', label: 'CLOSED TODAY', nextDue, doneToday: true, daysUntilDue };
  }
  if (task.scheduledDate) {
    return { status: 'scheduled', label: 'SCHEDULED', nextDue, doneToday: false, daysUntilDue };
  }
  if (daysUntilDue < 0) {
    return { status: 'overdue', label: 'OVERDUE', nextDue, doneToday: false, daysUntilDue, daysLate: -daysUntilDue };
  }
  if (daysUntilDue <= 7) {
    return { status: 'due', label: daysUntilDue <= 0 ? 'DUE TODAY' : 'DUE SOON', nextDue, doneToday: false, daysUntilDue };
  }
  return { status: 'ok', label: 'OK', nextDue, doneToday: false, daysUntilDue };
}

// A task belongs on "today's route" if it's not dormant/N-A and is due (or
// overdue) as of today, or is a Daily task (always on route until closed).
export function isOnTodayRoute(task, ref = new Date()) {
  const st = computeTaskStatus(task, ref);
  if (st.status === 'dormant' || st.status === 'na') return false;
  if (st.status === 'done') return true;
  if (task.frequency === 'Daily') return true;
  return ['overdue', 'due', 'not-started'].includes(st.status) && st.daysUntilDue !== undefined && st.daysUntilDue <= 0;
}

export function servicelifePct(asset, ref = new Date()) {
  if (!asset.installDate || !asset.expectedServiceLifeYears) return null;
  const installed = new Date(asset.installDate);
  const ageYears = (ref - installed) / (365.25 * DAY_MS);
  const pct = Math.max(0, Math.min(150, (ageYears / asset.expectedServiceLifeYears) * 100));
  return { pct: Math.round(pct), ageYears, remainingYears: Math.max(0, asset.expectedServiceLifeYears - ageYears) };
}

export function toneForLifePct(pct) {
  if (pct >= 90) return 'var(--color-danger)';
  if (pct >= 70) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export function toneForStatus(status) {
  switch (status) {
    case 'overdue': return { bg: 'var(--color-danger-tint)', fg: 'var(--color-danger)' };
    case 'due': return { bg: 'var(--color-gold-100)', fg: 'var(--color-gold-600)' };
    case 'ok': return { bg: 'var(--color-success-tint)', fg: 'var(--color-success)' };
    case 'done': return { bg: 'var(--color-mist)', fg: 'var(--color-teal-700)' };
    case 'scheduled': return { bg: 'var(--color-neutral-100)', fg: 'var(--color-neutral-500)' };
    case 'dormant': return { bg: 'var(--color-mist)', fg: 'var(--color-teal-700)' };
    case 'na': return { bg: 'var(--color-neutral-100)', fg: 'var(--color-neutral-500)' };
    default: return { bg: 'var(--color-neutral-100)', fg: 'var(--color-neutral-500)' };
  }
}

export function complianceForTasks(tasks, ref = new Date()) {
  const relevant = tasks.map((t) => ({ t, s: computeTaskStatus(t, ref) })).filter(({ s }) => s.status !== 'dormant' && s.status !== 'na');
  if (!relevant.length) return { pct: 100, overdueCount: 0, total: 0 };
  const overdueCount = relevant.filter(({ s }) => s.status === 'overdue').length;
  const compliant = relevant.filter(({ s }) => s.status !== 'overdue').length;
  return { pct: Math.round((compliant / relevant.length) * 100), overdueCount, total: relevant.length };
}

export function fmtDate(iso, opts = { month: 'short', day: 'numeric' }) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', opts);
}
export function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
export function fmtDateTime(iso) {
  if (!iso) return '—';
  return `${fmtDate(iso)}, ${fmtTime(iso)}`;
}
