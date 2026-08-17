import * as store from '../store.js';
import { computeTaskStatus, fmtDate } from '../calc.js';
import { icon } from '../icons.js';
import { tabBar } from '../components/ui.js';
import { navigate } from '../router.js';
import { FREQUENCIES } from '../seed.js';

function statusRows() {
  const ref = new Date();
  return store.state.tasks.map((t) => ({ task: t, status: computeTaskStatus(t, ref) }));
}

function pastDueSection(rows) {
  const overdue = rows.filter((r) => r.status.status === 'overdue').sort((a, b) => b.status.daysLate - a.status.daysLate);
  if (!overdue.length) {
    return `<div class="pastdue-card" style="background:var(--color-success-tint);border-left-color:var(--color-success)">
      <div class="lbl" style="color:var(--color-success)">NOTHING PAST DUE</div>
      <div class="pastdue-item"><div class="m" style="color:var(--color-neutral-600)">Every non-dormant task is on schedule right now.</div></div>
    </div>`;
  }
  return `<div class="pastdue-card">
    <div class="lbl">PAST DUE · ESCALATE TODAY</div>
    ${overdue.map(({ task, status }) => {
      const asset = task.assetId ? store.getAsset(task.assetId) : null;
      const last = task.lastCompleted ? `last closed ${fmtDate(task.lastCompleted)}` : 'never closed';
      return `<div class="pastdue-item">
        <div class="t">${task.task}</div>
        <div class="m">${task.category} · ${asset ? asset.name : (task.assetRefText || '')} · ${task.frequency.toLowerCase()}, ${last} · ${task.responsibleRole}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function programStatusSection(rows) {
  const items = FREQUENCIES.map((freq) => {
    const inFreq = rows.filter((r) => r.task.frequency === freq && r.status.status !== 'dormant' && r.status.status !== 'na');
    const total = inFreq.length;
    const closed = inFreq.filter((r) => r.status.status !== 'overdue' && r.status.status !== 'not-started').length;
    const overdueCount = inFreq.filter((r) => r.status.status === 'overdue').length;
    const pct = total ? Math.round((closed / total) * 100) : 100;
    const color = pct >= 80 ? 'var(--color-teal-600)' : 'var(--color-warning)';
    const note = total === 0 ? 'No tasks on this frequency for this park.' : (overdueCount ? `${overdueCount} past due.` : 'All current for this period.');
    return `<div class="freq-row">
      <div class="freq-row-top"><span class="label">${freq}</span><span class="count">${closed} of ${total} current</span></div>
      <div class="track"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="note">${note}</div>
    </div>`;
  }).join('');
  return `<div style="padding:26px 20px 0">
    <div class="section-label" style="padding:0">PROGRAM STATUS</div>
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">${items}</div>
  </div>`;
}

function dormantSection(rows) {
  const dormant = rows.filter((r) => r.status.status === 'dormant');
  if (!dormant.length) {
    return `<div class="dormant-shelf">
      <div class="hd">${icon('sun', { size: 17, color: '#006271' })}<span class="lbl">DORMANT FOR THE SEASON</span></div>
      <div class="body">Nothing is dormant right now — the full program is in season. Out-of-season tasks appear here and stop counting against the park automatically.</div>
    </div>`;
  }
  const byCat = {};
  let earliest = null;
  dormant.forEach(({ task, status }) => {
    byCat[task.category] = (byCat[task.category] || 0) + 1;
    if (!earliest || new Date(status.returnDate) < new Date(earliest)) earliest = status.returnDate;
  });
  const parts = Object.entries(byCat).map(([cat, n]) => `${n} ${cat}`).join(' and ');
  return `<div class="dormant-shelf">
    <div class="hd">${icon('sun', { size: 17, color: '#006271' })}<span class="lbl">DORMANT FOR THE SEASON</span></div>
    <div class="body">${parts} task${dormant.length === 1 ? ' is' : 's are'} paused. They reappear on <strong>${fmtDate(earliest)}</strong> — nothing counts against the park until then.</div>
  </div>`;
}

function upcomingSection(rows) {
  const ref = new Date();
  const in7 = rows.filter((r) => r.status.nextDue && r.status.status !== 'dormant' && r.status.status !== 'na' && r.status.status !== 'overdue' && r.status.status !== 'done'
    && (new Date(r.status.nextDue) - ref) / 86400000 <= 7);
  in7.sort((a, b) => new Date(a.status.nextDue) - new Date(b.status.nextDue));
  if (!in7.length) return '';
  return `<div style="padding:26px 20px 0">
    <div class="section-label" style="padding:0">COMING UP THIS WEEK</div>
    <div style="margin-top:12px">
      ${in7.map(({ task, status }) => {
        const d = new Date(status.nextDue);
        const isSafety = task.category === 'Playgrounds' && task.frequency === 'Weekly';
        return `<div class="upcoming-row">
          <div class="upcoming-date"><div class="day">${d.getDate()}</div><div class="dow">${d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</div></div>
          <div style="flex:1;min-width:0">
            <div class="task">${task.task}</div>
            <div class="who">${task.responsibleRole}${task.estMinutes ? ' · ' + task.estMinutes + ' min' : ''}</div>
          </div>
          <span class="pill" style="background:${isSafety ? 'var(--color-danger-tint)' : 'var(--color-mist)'};color:${isSafety ? 'var(--color-danger)' : 'var(--color-teal-700)'}">${isSafety ? 'SAFETY' : task.frequency.toUpperCase()}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

export function mount(root) {
  function rerender() {
    const rows = statusRows();
    const overdueCount = rows.filter((r) => r.status.status === 'overdue').length;
    const session = store.state.session;
    const user = store.getUser(session.actingUserId);
    const greetName = user.role === 'Facilities Manager' ? user.name : 'Dana';
    const stateLine = overdueCount
      ? `${overdueCount} item${overdueCount === 1 ? ' is' : 's are'} past due and need${overdueCount === 1 ? 's' : ''} a name and a date today.`
      : 'Nothing past due. Program is current across every frequency.';

    root.innerHTML = `
      <div class="screen">
        <div class="scroll" style="padding:56px 0 40px">
          <div style="padding:0 20px">
            <div class="hdr-eyebrow on-white">${session.parkCode} · ${session.parkName}</div>
            <div class="hdr-title--xl" style="color:var(--color-neutral-800)">Morning, ${greetName}.</div>
            <div style="font:400 14.5px/1.5 var(--font-sans);color:var(--color-neutral-600);margin-top:6px">${stateLine}</div>
          </div>
          ${pastDueSection(rows)}
          ${programStatusSection(rows)}
          ${dormantSection(rows)}
          ${upcomingSection(rows)}
        </div>
      </div>
      ${tabBar('mywork')}`;
  }
  rerender();
  const unsub = store.subscribe(rerender);
  return () => unsub();
}
