import { icon } from '../icons.js';
import { isOnline, queuedClosures } from '../store.js';

export function offlinePill() {
  const online = isOnline();
  const n = queuedClosures().length;
  if (online && n === 0) {
    return `<div class="offline-pill is-online"><span class="offline-dot"></span><span class="offline-label">ONLINE</span></div>`;
  }
  const label = online ? `${n} QUEUED` : `OFFLINE · ${n} QUEUED`;
  return `<div class="offline-pill" data-action="toggle-offline" role="button" title="Tap to simulate connectivity"><span class="offline-dot"></span><span class="offline-label">${label}</span></div>`;
}

export function progressBar(done, total, { height = 6 } = {}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="progress-track" style="height:${height}px"><div class="progress-fill" style="width:${pct}%"></div></div>`;
}

export function pill(label, tone) {
  return `<span class="pill" style="background:${tone.bg};color:${tone.fg}">${label}</span>`;
}

const TABS = [
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'assets', label: 'Assets', icon: 'home' },
  { key: 'issues', label: 'Issues', icon: 'alertTriangle' },
  { key: 'program', label: 'Program', icon: 'list' },
];

export function tabBar(active) {
  return `<nav class="tabbar">${TABS.map((t) => `
    <button class="tab ${t.key === active ? 'active' : ''}" data-nav="${t.key}">
      ${icon(t.icon, { size: 22, strokeWidth: t.key === active ? 2.3 : 2 })}
      <span>${t.label}</span>
    </button>`).join('')}</nav>`;
}

const PERSONAS = [
  { key: 'tech', label: 'TECH' },
  { key: 'fm', label: 'FM / GM' },
  { key: 'rom', label: 'ROM' },
];

export function personaSwitch(active) {
  return `<div class="persona-switch">${PERSONAS.map((p) => `
    <button class="${p.key === active ? 'active' : ''}" data-persona="${p.key}">${p.label}</button>`).join('')}</div>`;
}

export function wirePersonaSwitch(root, onChange) {
  root.querySelectorAll('[data-persona]').forEach((btn) => {
    btn.addEventListener('click', () => onChange(btn.dataset.persona));
  });
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
