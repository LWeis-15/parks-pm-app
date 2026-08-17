import * as store from '../store.js';
import { fmtDate } from '../calc.js';
import { icon } from '../icons.js';
import { tabBar } from '../components/ui.js';

export function mount(root) {
  function rerender() {
    const open = store.state.workOrders.filter((w) => w.status !== 'closed').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const closed = store.state.workOrders.filter((w) => w.status === 'closed');

    function card(wo) {
      const asset = wo.assetId ? store.getAsset(wo.assetId) : null;
      const safety = wo.priority === 'safety';
      const overdue = new Date(wo.dueDate) < new Date() && wo.status !== 'closed';
      return `<div class="overdue-card" style="border-left-color:${safety ? 'var(--color-danger)' : 'var(--color-neutral-200)'}">
        <div class="top">
          <span class="pill" style="background:${safety ? 'var(--color-danger-tint)' : 'var(--color-mist)'};color:${safety ? 'var(--color-danger)' : 'var(--color-teal-700)'}">${safety ? 'SAFETY — 48 HR' : 'ROUTINE'}</span>
          <span class="cat">${asset ? asset.category.toUpperCase() : ''}</span>
          <span class="late" style="color:${overdue ? 'var(--color-danger)' : 'var(--color-neutral-400)'}">${wo.status === 'closed' ? 'CLOSED' : (overdue ? 'PAST DUE' : `DUE ${fmtDate(wo.dueDate).toUpperCase()}`)}</span>
        </div>
        <div class="task">${wo.title}</div>
        <div class="who">${asset ? asset.name + ' · ' : ''}${wo.ownerName || 'Unassigned'}${wo.notifyRoles?.length ? ' · notified ' + wo.notifyRoles.join(' & ') : ''}</div>
        ${wo.status !== 'closed' ? `<button type="button" data-resolve="${wo.id}" style="margin-top:10px;border:1px solid var(--color-neutral-200);background:#fff;color:var(--color-teal-600);font:600 12px var(--font-sans);padding:7px 12px;border-radius:8px;cursor:pointer">Mark resolved</button>` : ''}
      </div>`;
    }

    root.innerHTML = `
      <div class="screen">
        <div class="hdr hdr--white">
          <div class="hdr-eyebrow on-white">${store.state.session.parkCode} · ${store.state.session.parkName}</div>
          <div class="hdr-title--lg" style="color:var(--color-neutral-800)">Issues</div>
        </div>
        <div class="scroll" style="padding:14px 14px 40px">
          ${open.length ? `<div style="display:flex;flex-direction:column;gap:9px">${open.map(card).join('')}</div>` : `<div class="empty-state"><div class="icon">${icon('check', { size: 40, color: 'var(--color-success)' })}</div><div class="title">No open issues</div><div class="body">Work orders created from failed inspections or the asset register will show up here.</div></div>`}
          ${closed.length ? `<div class="section-label" style="padding:22px 4px 10px">RESOLVED</div><div style="display:flex;flex-direction:column;gap:9px">${closed.map(card).join('')}</div>` : ''}
        </div>
      </div>
      ${tabBar('issues')}`;

    root.querySelectorAll('[data-resolve]').forEach((btn) => btn.addEventListener('click', () => store.resolveWorkOrder(Number(btn.dataset.resolve))));
  }
  rerender();
  const unsub = store.subscribe(rerender);
  return () => unsub();
}
