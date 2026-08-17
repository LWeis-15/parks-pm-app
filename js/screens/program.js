import * as store from '../store.js';
import { computeTaskStatus, toneForStatus, fmtDate } from '../calc.js';
import { pill, tabBar } from '../components/ui.js';
import { FREQUENCIES } from '../seed.js';
import { ROUTE_CATEGORY_ORDER } from '../store.js';

let activeFreq = 'Daily';

export function mount(root) {
  function rerender() {
    const ref = new Date();
    const rows = store.state.tasks
      .filter((t) => t.frequency === activeFreq)
      .map((t) => ({ task: t, status: computeTaskStatus(t, ref) }));

    const byCat = {};
    rows.forEach((r) => { (byCat[r.task.category] = byCat[r.task.category] || []).push(r); });
    const cats = ROUTE_CATEGORY_ORDER.filter((c) => byCat[c]);

    root.innerHTML = `
      <div class="screen">
        <div class="hdr hdr--white">
          <div class="hdr-eyebrow on-white">${store.state.session.parkCode} · ${store.state.session.parkName}</div>
          <div class="hdr-title--lg" style="color:var(--color-neutral-800)">Program</div>
          <div class="chip-row">
            ${FREQUENCIES.map((f) => `<span class="chip ${f === activeFreq ? 'active' : ''}" data-freq="${f}">${f}</span>`).join('')}
          </div>
        </div>
        <div class="scroll" style="padding:14px 14px 40px">
          <div style="font:400 12px/1.5 var(--font-sans);color:var(--color-fg-muted);padding:2px 4px 12px">Fixed regional program. Category, task, standard, role, est. time and season are set by the region — parks can't edit them here.</div>
          ${cats.length ? cats.map((cat) => `
            <div class="card" style="margin-bottom:12px;overflow:hidden">
              <div class="program-group-hdr">
                <span class="section-label" style="padding:0">${cat}</span>
                <span class="section-meta">${byCat[cat].length}</span>
              </div>
              ${byCat[cat].map(({ task, status }) => {
                const tone = toneForStatus(status.status);
                return `<div class="list-row" style="cursor:default">
                  <div class="row-task">${task.task}</div>
                  <div style="font:400 12px/1.45 var(--font-sans);color:var(--color-neutral-500);margin-top:4px">${task.standard}</div>
                  <div style="display:flex;gap:7px;margin-top:9px;align-items:center;flex-wrap:wrap">
                    ${pill(status.label, tone)}
                    <span style="font:600 10.5px var(--font-sans);color:var(--color-neutral-400);letter-spacing:.05em">${task.responsibleRole}${task.estMinutes ? ' · ' + task.estMinutes + ' MIN' : ''} · ${task.season.toUpperCase()}</span>
                  </div>
                </div>`;
              }).join('')}
            </div>`).join('') : `<div style="font:400 13px var(--font-sans);color:var(--color-fg-muted);padding:16px 4px">No ${activeFreq.toLowerCase()} tasks on file.</div>`}
        </div>
      </div>
      ${tabBar('program')}`;

    root.querySelectorAll('[data-freq]').forEach((el) => el.addEventListener('click', () => { activeFreq = el.dataset.freq; rerender(); }));
  }
  rerender();
  const unsub = store.subscribe(rerender);
  return () => unsub();
}
