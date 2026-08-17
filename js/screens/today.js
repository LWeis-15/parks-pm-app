import * as store from '../store.js';
import { computeTaskStatus, isOnTodayRoute, toneForStatus } from '../calc.js';
import { icon } from '../icons.js';
import { offlinePill, pill, tabBar } from '../components/ui.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';
import { ROUTE_CATEGORY_ORDER } from '../store.js';

let focusOverride = null;

function routeTasks() {
  const ref = new Date();
  return store.state.tasks
    .filter((t) => isOnTodayRoute(t, ref))
    .map((t) => ({ task: t, status: computeTaskStatus(t, ref) }))
    .sort((a, b) => {
      const ai = ROUTE_CATEGORY_ORDER.indexOf(a.task.category);
      const bi = ROUTE_CATEGORY_ORDER.indexOf(b.task.category);
      if (ai !== bi) return ai - bi;
      return a.task.id - b.task.id;
    });
}

function nextScheduledTask() {
  const ref = new Date();
  const upcoming = store.state.tasks
    .map((t) => ({ t, s: computeTaskStatus(t, ref) }))
    .filter(({ s }) => s.nextDue && s.status !== 'dormant' && s.status !== 'na' && s.status !== 'done')
    .sort((a, b) => new Date(a.s.nextDue) - new Date(b.s.nextDue));
  return upcoming[0] || null;
}

function assetLabel(task) {
  const asset = task.assetId ? store.getAsset(task.assetId) : null;
  return { name: asset ? asset.name : (task.assetRefText || '—'), location: asset ? asset.location : '' };
}

function render() {
  const session = store.state.session;
  const all = routeTasks();
  const done = all.filter((r) => r.status.doneToday);
  const remaining = all.filter((r) => !r.status.doneToday);
  const queuedN = store.queuedClosures().length;

  let focus = null;
  if (focusOverride) focus = remaining.find((r) => r.task.id === focusOverride) || null;
  if (!focus) focus = remaining[0] || null;

  const restList = remaining.filter((r) => r.task.id !== (focus && focus.task.id));

  const doneCount = done.length;
  const total = all.length;
  const overdueCount = all.filter((r) => r.status.status === 'overdue').length;
  const pct = total ? Math.round((doneCount / total) * 100) : 100;

  let focusHtml;
  if (!focus) {
    const next = nextScheduledTask();
    focusHtml = `
      <div class="focus-card" style="text-align:center;padding:32px 18px">
        ${icon('check', { size: 40, color: 'var(--color-success)' })}
        <div style="font:700 19px var(--font-sans);color:var(--color-neutral-800);margin-top:14px">Day complete</div>
        <div style="font:400 13.5px/1.5 var(--font-sans);color:var(--color-fg-muted);margin-top:6px">
          ${total} of ${total} closed. ${queuedN} closure${queuedN === 1 ? '' : 's'} queued for sync.
          ${next ? `Next up: <strong>${next.t.task}</strong> (${next.t.frequency}, ${next.s.nextDue ? new Date(next.s.nextDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}).` : ''}
        </div>
      </div>`;
  } else {
    const { task, status } = focus;
    const asset = assetLabel(task);
    focusHtml = `
      <div class="focus-card">
        <div class="counter-row">
          <span class="up-next">UP NEXT · ${doneCount + 1} OF ${total}</span>
          <span class="freq-est">${task.frequency.toUpperCase()}${task.estMinutes ? ` · ${task.estMinutes} MIN` : ''}</span>
        </div>
        <div class="category">${task.category}</div>
        <div class="task-title">${task.task}</div>
        <div class="standard-block">
          <div class="label">MEETS STANDARD WHEN</div>
          <div class="body">${task.standard}</div>
        </div>
        <div class="asset-row">
          ${icon('home', { size: 16, color: '#939598' })}
          <div>
            <div class="name">${asset.name}</div>
            ${asset.location ? `<div class="loc">${asset.location}</div>` : ''}
          </div>
        </div>
        <div class="actions-row">
          <button class="btn btn-primary" data-action="meets" data-task-id="${task.id}">
            ${icon('check', { size: 20, strokeWidth: 2.6 })} Meets standard
          </button>
          <button class="btn btn-danger-outline" data-action="issue" data-task-id="${task.id}">Issue</button>
        </div>
        <div style="text-align:center;margin-top:12px">
          <button type="button" data-action="na" data-task-id="${task.id}" style="border:0;background:none;color:var(--color-fg-muted);font:600 11.5px var(--font-sans);letter-spacing:.03em;cursor:pointer">Doesn't apply here &middot; mark N/A</button>
        </div>
      </div>`;
  }

  const restHtml = restList.length ? `
    <div class="section-label-row">
      <span class="section-label">REST OF TODAY</span>
      <span class="section-meta">${overdueCount} overdue</span>
    </div>
    <div class="list-card">
      ${restList.map(({ task, status }) => {
        const tone = toneForStatus(status.status);
        const asset = assetLabel(task);
        return `<div class="list-row" data-action="focus-row" data-task-id="${task.id}">
          <div class="list-row-top">
            <span class="cat-caps">${task.category}</span>
            ${pill(status.label, tone)}
          </div>
          <div class="row-task">${task.task}</div>
          <div class="row-meta">${task.estMinutes ? `${task.estMinutes} MIN · ` : ''}${asset.name.toUpperCase()}</div>
        </div>`;
      }).join('')}
    </div>` : (restList.length === 0 && remaining.length <= 1 ? '' : '');

  const queueStrip = `
    <button class="queued-strip" data-nav="queue">
      ${icon('check', { size: 18, color: '#2e8b57' })}
      <span class="text">${queuedN} closed and queued for sync</span>
      <span class="review">Review</span>
    </button>`;

  return `
    <div class="hdr">
      <div class="hdr-row">
        <div class="hdr-eyebrow">${session.parkCode} · ${session.parkName}</div>
        ${offlinePill()}
      </div>
      <div class="progress-row">
        <div class="hdr-title">Morning route</div>
        <span style="font:600 11px var(--font-sans);letter-spacing:.06em;color:var(--color-teal-100)">${doneCount} OF ${total} CLOSED</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="scroll" style="padding:14px 14px 90px">
      ${focusHtml}
      ${restHtml}
      ${queueStrip}
    </div>
    ${tabBar('today')}`;
}

function attemptClose(taskId) {
  const task = store.getTask(taskId);
  const needsProof = task.proofRequirements && (task.proofRequirements.photo || task.proofRequirements.readings.length || task.proofRequirements.note);
  if (!needsProof) {
    store.closeTask({ taskId }).then(({ closureId, prevLastCompleted }) => {
      showToast(`${task.task} closed`, {
        onAction: () => store.undoClose({ closureId, prevLastCompleted, taskId }),
      });
    });
  } else {
    navigate(`closeout/${taskId}`);
  }
}

export function mount(root) {
  focusOverride = null;
  const rerender = () => { root.innerHTML = render(); wire(); };

  function wire() {
    root.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.nav)));
    root.querySelectorAll('[data-action="meets"]').forEach((el) => el.addEventListener('click', () => attemptClose(Number(el.dataset.taskId))));
    root.querySelectorAll('[data-action="issue"]').forEach((el) => el.addEventListener('click', () => navigate(`closeout-failed/${el.dataset.taskId}/1`)));
    root.querySelectorAll('[data-action="na"]').forEach((el) => el.addEventListener('click', async () => {
      const id = Number(el.dataset.taskId);
      const task = store.getTask(id);
      await store.markNA(id);
      showToast(`${task.task} marked N/A — still tracked, won't count against the park`, { duration: 4000 });
    }));
    root.querySelectorAll('[data-action="focus-row"]').forEach((el) => el.addEventListener('click', () => {
      focusOverride = Number(el.dataset.taskId);
      rerender();
      root.scrollTo?.(0, 0);
    }));
    const offlineBtn = root.querySelector('[data-action="toggle-offline"]');
    if (offlineBtn) offlineBtn.addEventListener('click', () => store.toggleForceOffline());
  }

  rerender();
  const unsub = store.subscribe(rerender);
  return () => unsub();
}
