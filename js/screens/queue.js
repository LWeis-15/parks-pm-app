import * as store from '../store.js';
import { icon } from '../icons.js';
import { fmtTime, fmtDateTime } from '../calc.js';
import { showToast } from '../components/toast.js';
import { navigate } from '../router.js';

function pillFor(closure, workOrder) {
  if (closure.outcome === 'fail') {
    return workOrder && workOrder.priority === 'safety'
      ? { label: 'SAFETY', bg: 'var(--color-danger-tint)', fg: 'var(--color-danger)' }
      : { label: 'FOLLOW-UP', bg: 'var(--color-gold-100)', fg: 'var(--color-gold-600)' };
  }
  if (workOrder) return { label: 'FOLLOW-UP', bg: 'var(--color-gold-100)', fg: 'var(--color-gold-600)' };
  return { label: 'READY', bg: 'var(--color-mist)', fg: 'var(--color-teal-700)' };
}

function metaFor(closure, task) {
  const bits = [];
  if (task) bits.push(task.task.length > 44 ? task.task.slice(0, 44) + '…' : null);
  bits.length = 0;
  const parts = [];
  const asset = task && task.assetId ? store.getAsset(task.assetId) : null;
  parts.push(asset ? asset.name : (task ? task.assetRefText : ''));
  parts.push(fmtTime(closure.completedAt));
  if (closure.photoIds.length) parts.push(`${closure.photoIds.length} photo${closure.photoIds.length > 1 ? 's' : ''}`);
  if (closure.readings && closure.readings.length) parts.push(closure.readings.map((r) => `${r.label} ${r.value}`).join(' / '));
  const wo = store.state.workOrders.find((w) => w.sourceClosureId === closure.id);
  if (wo) parts.push('work order attached');
  return parts.filter(Boolean).join(' · ');
}

export function mount(root) {
  function rerender() {
    const queued = store.queuedClosures().sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    const photoTotal = queued.reduce((n, c) => n + (c.photoIds?.length || 0), 0);
    const online = store.isOnline();

    root.innerHTML = `
      <div class="screen no-tabbar">
        <div class="scroll">
          <div class="hdr hdr--deep">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:8px;height:8px;border-radius:999px;background:${online ? '#6fe0a0' : 'var(--color-gold-400)'};display:block"></span>
              <span style="font:600 11px var(--font-sans);letter-spacing:.12em;color:var(--color-teal-200)">${online ? 'ONLINE' : 'NO SIGNAL'} · ${store.state.session.parkCode}</span>
            </div>
            <div style="font:700 25px/1.2 var(--font-sans);margin-top:14px">${queued.length} closure${queued.length === 1 ? '' : 's'} waiting</div>
            <div style="font:400 13.5px/1.5 var(--font-sans);color:var(--color-teal-100);margin-top:7px">Held on this device with photos, readings and timestamps. Last sync ${fmtDateTime(store.state.session.lastSyncAt)}.</div>
          </div>
          <div style="padding:14px 14px 40px">
            ${queued.length ? `<div class="list-card">
              ${queued.map((c) => {
                const task = store.getTask(c.taskId);
                const wo = store.state.workOrders.find((w) => w.sourceClosureId === c.id);
                const p = pillFor(c, wo);
                return `<div class="queue-row">
                  ${icon('clock', { size: 18, color: '#939598' })}
                  <div style="flex:1;min-width:0">
                    <div class="task">${task ? task.task : 'Unknown task'}</div>
                    <div class="meta">${metaFor(c, task)}</div>
                  </div>
                  <span class="pill" style="background:${p.bg};color:${p.fg}">${p.label}</span>
                </div>`;
              }).join('')}
            </div>` : `<div class="empty-state">
              <div class="icon">${icon('check', { size: 40, color: 'var(--color-success)' })}</div>
              <div class="title">All caught up</div>
              <div class="body">Nothing queued right now. Closures you make offline will show up here until they sync.</div>
            </div>`}

            <div class="kv-card">
              <div class="section-label" style="padding:0">WHAT SYNC WRITES</div>
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:9px">
                <div class="kv-row"><span class="k">LAST COMPLETED</span><span class="v">Per task — recalculated on close</span></div>
                <div class="kv-row"><span class="k">COMPLETED BY</span><span class="v">${store.actingUser().name}</span></div>
                <div class="kv-row"><span class="k">ASSET REF.</span><span class="v">Matched to register</span></div>
                <div class="kv-row"><span class="k">STATUS</span><span class="v">Recalculated from Next Due</span></div>
              </div>
              <div class="kv-divider"></div>
              <div class="kv-note">Photos, readings and work orders stay in the app and are linked from the workbook row. The sheet stays the region's record; the app stays the evidence.</div>
            </div>

            <button class="btn btn-footer" style="width:100%;margin-top:14px" data-action="sync" ${queued.length ? '' : 'disabled'}>Sync now — ${queued.length} item${queued.length === 1 ? '' : 's'}, ${photoTotal} photo${photoTotal === 1 ? '' : 's'}</button>
            <div style="text-align:center;font:400 11.5px var(--font-sans);color:var(--color-neutral-400);margin-top:10px">Syncs on its own at the shop, the office, or any park WiFi.</div>
          </div>
        </div>
      </div>`;

    const syncBtn = root.querySelector('[data-action="sync"]');
    if (syncBtn) syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      const n = await store.syncNow();
      showToast(`Synced ${n} item${n === 1 ? '' : 's'}`, { duration: 3000 });
    });
  }
  rerender();
  const unsub = store.subscribe(rerender);
  return () => unsub();
}
