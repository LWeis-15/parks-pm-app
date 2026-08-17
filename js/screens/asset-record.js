import * as store from '../store.js';
import { computeTaskStatus, servicelifePct, toneForLifePct, fmtDate } from '../calc.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export function mount(root, params) {
  const assetId = params[0];
  const asset = store.getAsset(assetId);
  if (!asset) { navigate('assets'); return () => {}; }

  function rerender() {
    const life = servicelifePct(asset);
    const tone = life ? toneForLifePct(life.pct) : 'var(--color-neutral-400)';
    const tasks = store.tasksForAsset(assetId).map((t) => ({ task: t, status: computeTaskStatus(t) }))
      .sort((a, b) => a.task.frequency.localeCompare(b.task.frequency));

    const dotColor = (s) => s.status === 'overdue' ? 'var(--color-danger)' : (s.status === 'due' ? 'var(--color-warning)' : (s.status === 'ok' || s.status === 'done' ? 'var(--color-success)' : 'var(--color-neutral-400)'));
    const lastLine = (t, s) => {
      if (s.status === 'scheduled') return `Scheduled ${fmtDate(s.nextDue)} · ${t.responsibleRole}`;
      const closure = store.lastClosureForTask(t.id);
      if (closure) return `Closed ${fmtDate(closure.completedAt)} · ${closure.completedByName}`;
      if ((s.status === 'ok' || s.status === 'done') && t.lastCompleted) return `Closed ${fmtDate(t.lastCompleted)} · ${t.responsibleRole}`;
      if (s.nextDue) return `Due ${fmtDate(s.nextDue)} · ${t.responsibleRole}`;
      return `Not started · ${t.responsibleRole}`;
    };

    root.innerHTML = `
      <div class="screen no-tabbar">
        <div class="scroll">
          <div class="hdr">
            <button class="back-row" data-action="back">${icon('chevronLeft', { size: 18, color: '#7cbdc5', strokeWidth: 2.4 })}<span>ASSET REGISTER</span></button>
            <div style="font:700 10.5px var(--font-sans);letter-spacing:.14em;color:var(--color-gold-400);margin-top:18px">${asset.category.toUpperCase()}</div>
            <div style="font:700 26px/1.2 var(--font-sans);margin-top:7px">${asset.name}</div>
            <div style="font:400 13.5px var(--font-sans);color:var(--color-teal-100);margin-top:6px">${asset.manufacturerModel} · ${asset.location} · ${store.state.session.parkCode}</div>
          </div>

          <div class="stat-strip">
            <div class="cell"><div class="k">INSTALLED</div><div class="v">${fmtDate(asset.installDate, { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
            <div class="cell"><div class="k">SERVICE LIFE</div><div class="v">${asset.expectedServiceLifeYears} years</div></div>
            <div class="cell"><div class="k">REMAINING</div><div class="v" style="color:${tone}">${life ? life.remainingYears.toFixed(1) : '—'} years</div></div>
          </div>

          ${life ? `<div style="padding:18px 20px 0">
            <div class="warn-banner"><div style="margin-top:1px">${icon('crosshair', { size: 17, color: '#a07d2b' })}</div>
              <div class="txt">${life.pct}% of expected life spent.${life.pct >= 70 ? ' Plan replacement in an upcoming capital cycle.' : ''}</div>
            </div>
          </div>` : ''}

          <div style="padding:24px 20px 0">
            <div class="section-label">PM TASKS ON THIS ASSET</div>
            <div style="margin-top:12px">
              ${tasks.length ? tasks.map(({ task, status }) => `
                <div class="asset-task-row">
                  <div class="status-dot" style="background:${dotColor(status)}"></div>
                  <div style="flex:1;min-width:0;margin-top:-4px">
                    <div class="freq">${task.frequency.toUpperCase()}</div>
                    <div class="task">${task.task}</div>
                    <div class="last">${lastLine(task, status)}</div>
                  </div>
                </div>`).join('') : `<div style="font:400 13px var(--font-sans);color:var(--color-fg-muted);padding:8px 0">No PM tasks reference this asset yet.</div>`}
            </div>
          </div>

          <div style="padding:24px 20px 0">
            <div class="section-label">VENDOR &amp; PARTS TRAIL</div>
            ${asset.vendorTrail && asset.vendorTrail.length ? `<div class="vendor-list">
              ${asset.vendorTrail.map((v) => `<div class="vendor-item"><div class="t">${v.title}</div><div class="m">${fmtDate(v.date, { month: 'short', day: 'numeric', year: 'numeric' })} · ${v.detail}</div></div>`).join('')}
            </div>` : `<div style="font:400 13px var(--font-sans);color:var(--color-fg-muted);padding:10px 0">No vendor visits logged yet.</div>`}
          </div>

          <div style="padding:20px 20px 44px">
            <button class="btn-teal-outline" data-action="log-task">Log a task against this asset</button>
          </div>
        </div>
      </div>`;

    root.querySelector('[data-action="back"]').addEventListener('click', () => navigate('assets'));
    root.querySelector('[data-action="log-task"]').addEventListener('click', async () => {
      await store.createWorkOrder({
        assetId: asset.id, title: `Ad-hoc task — ${asset.name}`,
        ownerId: 'u_druiz', ownerName: 'D. Ruiz', dueHours: 336, priority: 'routine',
      });
      showToast('Work order logged against this asset');
      navigate('issues');
    });
  }
  rerender();
  const unsub = store.subscribe(rerender);
  return () => unsub();
}
