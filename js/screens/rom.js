import * as store from '../store.js';
import { computeTaskStatus, complianceForTasks, fmtDate } from '../calc.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';
import { OTHER_PARKS, ROM_PARK_SNAPSHOT, ROM_OVERDUE_OTHER_PARKS } from '../seed.js';

function toneForPct(pct) {
  if (pct < 80) return 'var(--color-danger)';
  if (pct < 90) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export function mount(root) {
  function rerender() {
    const ref = new Date();
    const jlv = complianceForTasks(store.state.tasks, ref);
    const jlvRow = { code: 'JLV', state: store.state.session.parkState, pct: jlv.pct, note: `${jlv.overdueCount} overdue`, live: true };
    const otherRows = OTHER_PARKS.map((p) => ({ code: p.code, state: p.state, pct: ROM_PARK_SNAPSHOT[p.code].pct, note: ROM_PARK_SNAPSHOT[p.code].note, live: false }));
    const allParks = [jlvRow, ...otherRows].sort((a, b) => a.pct - b.pct);

    const totalOverdue = jlv.overdueCount + OTHER_PARKS.reduce((n, p) => n + ROM_PARK_SNAPSHOT[p.code].overdueCount, 0);
    const regionPct = Math.round(allParks.reduce((s, p) => s + p.pct, 0) / allParks.length);

    const jlvOverdue = store.state.tasks
      .map((t) => ({ task: t, status: computeTaskStatus(t, ref) }))
      .filter(({ status }) => status.status === 'overdue')
      .map(({ task, status }) => ({
        park: 'JLV', category: task.category.toUpperCase(), daysLate: status.daysLate, task: task.task,
        who: `${task.responsibleRole}${task.lastCompleted ? ' · gap since ' + fmtDate(task.lastCompleted) : ' · never closed'}`,
      }));
    const overdueAll = [...jlvOverdue, ...ROM_OVERDUE_OTHER_PARKS].sort((a, b) => b.daysLate - a.daysLate);

    root.innerHTML = `
      <div class="screen no-tabbar">
        <div class="scroll">
          <div class="hdr">
            <div class="hdr-eyebrow">REGION 4 · L. WEIS</div>
            <div class="hdr-title--lg">PM Compliance</div>
            <div class="rom-stats">
              <div class="rom-stat"><div class="val">${regionPct}%</div><div class="lbl">REGION, LIVE</div></div>
              <div class="rom-stat"><div class="val gold">${totalOverdue}</div><div class="lbl">OVERDUE TASKS</div></div>
              <div class="rom-stat"><div class="val">${allParks.length}</div><div class="lbl">PARKS REPORTING</div></div>
            </div>
          </div>

          <div style="padding:20px 16px 0">
            <div class="section-label" style="padding:0 4px">BY PARK · LOWEST FIRST</div>
            <div class="list-card" style="margin-top:11px">
              ${allParks.map((p) => {
                const tone = toneForPct(p.pct);
                return `<div class="park-row" data-park="${p.code}">
                  <div class="park-code-col"><div class="code">${p.code}</div><div class="state">${p.state}</div></div>
                  <div class="mid">
                    <div class="bar-track"><div class="progress-fill" style="width:${p.pct}%;background:${tone}"></div></div>
                    <div class="note">${p.note}${p.live ? ' · this device' : ''}</div>
                  </div>
                  <div class="pct" style="color:${tone}">${p.pct}%</div>
                </div>`;
              }).join('')}
            </div>
          </div>

          <div style="padding:24px 16px 0">
            <div style="display:flex;align-items:baseline;justify-content:space-between;padding:0 4px">
              <span class="section-label danger" style="padding:0">OVERDUE — NEEDS A NAME AND A DATE</span>
              <span style="font:600 11px var(--font-sans);color:var(--color-teal-600)">All ${overdueAll.length}</span>
            </div>
            <div style="margin-top:11px;display:flex;flex-direction:column;gap:9px">
              ${overdueAll.length ? overdueAll.map((o) => `
                <div class="overdue-card">
                  <div class="top">
                    <span class="park-chip">${o.park}</span>
                    <span class="cat">${o.category}</span>
                    <span class="late">${o.daysLate} DAY${o.daysLate === 1 ? '' : 'S'} LATE</span>
                  </div>
                  <div class="task">${o.task}</div>
                  <div class="who">${o.who}</div>
                </div>`).join('') : `<div style="font:400 13px var(--font-sans);color:var(--color-fg-muted);padding:8px 4px">Nothing overdue across the region.</div>`}
            </div>
          </div>

          <div class="digest-card">
            <div class="lbl">MONDAY DIGEST</div>
            <div class="body">Every Monday 6 AM: one email per park to the GM and Facilities Manager with last week's closures, anything past due, and the workbook rows the app wrote. Nothing for you to assemble.</div>
          </div>
        </div>
      </div>`;

    root.querySelectorAll('[data-park]').forEach((el) => el.addEventListener('click', () => {
      if (el.dataset.park === 'JLV') navigate('mywork');
      else showToast(`${el.dataset.park} detail syncs from the server — not cached on this device.`, { duration: 3500 });
    }));
  }
  rerender();
  const unsub = store.subscribe(rerender);
  return () => unsub();
}
