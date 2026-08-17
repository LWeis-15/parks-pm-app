import * as store from '../store.js';
import { icon } from '../icons.js';
import { photoRow, fillPhotoImages, wirePhotoRow } from '../components/photos.js';
import { navigate } from '../router.js';
import { fmtDateTime } from '../calc.js';

const READING_DEFS = {
  freeChlorine: { label: 'Free chlorine (ppm)', unit: 'ppm' },
  ph: { label: 'pH', unit: '' },
};

function evalReading(key, value) {
  const range = store.poolCodeRange()[key];
  const def = READING_DEFS[key];
  if (!range || value === '' || value === null || Number.isNaN(Number(value))) {
    return { key, label: def.label, value, inRange: null, rangeText: range ? `${store.state.session.parkState} code: ${range.min}–${range.max}` : '' };
  }
  const v = Number(value);
  const inRange = v >= range.min && v <= range.max;
  const dir = v > range.max ? 'HIGH' : (v < range.min ? 'LOW' : 'IN RANGE');
  return { key, label: def.label, value: v, inRange, dir, rangeText: `${store.state.session.parkState} code: ${range.min}–${range.max}` };
}

export function mount(root, params) {
  const taskId = Number(params[0]);
  const task = store.getTask(taskId);
  if (!task) { navigate('today'); return () => {}; }

  const state = {
    readingValues: {},
    photoIds: [],
    note: '',
    completedByUserId: store.state.session.actingUserId,
    changingUser: false,
  };
  (task.proofRequirements.readings || []).forEach((k) => {
    state.readingValues[k] = k === 'freeChlorine' ? '2.4' : (k === 'ph' ? '7.9' : '');
  });

  function evaluatedReadings() {
    return (task.proofRequirements.readings || []).map((k) => evalReading(k, state.readingValues[k]));
  }

  function canClose() {
    if (task.proofRequirements.photo && state.photoIds.length === 0) return false;
    if (task.proofRequirements.note && !state.note.trim()) return false;
    const readings = evaluatedReadings();
    if (readings.some((r) => r.inRange === null)) return false;
    return true;
  }

  function outOfRangeBanner() {
    const readings = evaluatedReadings();
    const bad = readings.find((r) => r.inRange === false);
    if (!bad) return '';
    return `<div class="warn-banner"><div style="margin-top:1px">${icon('alertCircle', { size: 16, color: '#a07d2b' })}</div>
      <div class="txt">${bad.label} is ${bad.dir === 'HIGH' ? 'above' : 'below'} code range. Closing this task will open a follow-up to retest.</div></div>`;
  }

  function assetLabel() {
    const asset = task.assetId ? store.getAsset(task.assetId) : null;
    return { name: asset ? asset.name : (task.assetRefText || '—'), location: asset ? asset.location : '' };
  }

  function render() {
    const user = store.getUser(state.completedByUserId);
    const asset = assetLabel();
    const readings = task.proofRequirements.readings.length ? `
      <div class="section-label" style="margin-top:22px">READINGS</div>
      <div class="readings-row">
        ${evaluatedReadings().map((r) => `
          <div class="reading">
            <div class="lbl">${r.label}</div>
            <div class="box ${r.inRange === false ? 'out' : ''}">
              <input type="text" inputmode="decimal" data-reading="${r.key}" value="${r.value ?? ''}">
              <span class="tag ${r.inRange === false ? 'out' : ''}">${r.inRange === null ? '' : (r.inRange ? 'IN RANGE' : r.dir)}</span>
            </div>
            <div class="range">${r.rangeText}</div>
          </div>`).join('')}
      </div>
      ${outOfRangeBanner()}
    ` : '';

    const userPicker = state.changingUser ? `
      <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;background:var(--color-neutral-50);border-radius:12px;padding:8px">
        ${store.state.users.map((u) => `<button type="button" data-pick-user="${u.id}" style="text-align:left;border:0;background:${u.id === state.completedByUserId ? 'var(--color-mist)' : 'transparent'};padding:8px 10px;border-radius:8px;font:600 13px var(--font-sans);color:var(--color-neutral-800);cursor:pointer">${u.name} <span style="font-weight:400;color:var(--color-fg-muted)">· ${u.role}</span></button>`).join('')}
      </div>` : '';

    return `
      <div class="sheet-backdrop">
        <div class="sheet">
          <div class="sheet-hdr">
            <div class="sheet-grab"></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div class="section-label">${task.category.toUpperCase()} · ${task.frequency.toUpperCase()}</div>
                <div style="font:700 19px/1.25 var(--font-sans);color:var(--color-neutral-800);margin-top:6px">${task.task}</div>
                <div style="font:400 12.5px/1.45 var(--font-sans);color:var(--color-neutral-600);margin-top:7px">${task.standard}</div>
              </div>
              <button type="button" data-action="cancel" style="border:0;background:none;color:var(--color-fg-muted);font:600 12px var(--font-sans);cursor:pointer;flex:none">Cancel</button>
            </div>
          </div>
          <div class="sheet-body">
            <div class="auto-strip">
              <span class="item">${asset.name}${asset.location ? ' · ' + asset.location : ''}</span>
              <span class="dot"></span>
              <span class="item">${fmtDateTime(new Date().toISOString())}</span>
              <span class="dot"></span>
              <span class="item gps">GPS on site</span>
            </div>
            ${readings}
            <div class="section-label" style="margin-top:24px">PHOTO ${task.proofRequirements.photo ? '— REQUIRED' : '(optional)'}</div>
            ${photoRow(state.photoIds)}
            <div class="section-label" style="margin-top:24px">NOTE${task.proofRequirements.note ? ' — REQUIRED' : ''}</div>
            <textarea class="note-box" data-note placeholder="Add a note&hellip;">${state.note}</textarea>
            <div class="section-label" style="margin-top:24px">COMPLETED BY</div>
            <div class="completed-by">
              <div class="avatar">${user.initials}</div>
              <div class="who">
                <div class="name">${user.name}</div>
                <div class="role">${user.role}${user.certification ? ' · ' + user.certification : ''}</div>
              </div>
              <button type="button" class="change" data-action="toggle-change-user">Change</button>
            </div>
            ${userPicker}
          </div>
          <div class="sheet-footer">
            <button class="btn btn-footer sm" data-action="close-task" ${canClose() ? '' : 'disabled'}>Close task &middot; queue for sync</button>
            <div class="sheet-caption">Writes Last Completed, Completed By and Status to the region workbook when signal returns.</div>
          </div>
        </div>
      </div>`;
  }

  function wire() {
    root.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('today'));
    root.querySelectorAll('[data-reading]').forEach((inp) => inp.addEventListener('input', () => {
      state.readingValues[inp.dataset.reading] = inp.value;
      rerender(true);
    }));
    root.querySelector('[data-note]').addEventListener('input', (e) => { state.note = e.target.value; updateCloseBtn(); });
    root.querySelector('[data-action="toggle-change-user"]').addEventListener('click', () => { state.changingUser = !state.changingUser; rerender(); });
    root.querySelectorAll('[data-pick-user]').forEach((btn) => btn.addEventListener('click', () => {
      state.completedByUserId = btn.dataset.pickUser; state.changingUser = false; rerender();
    }));
    wirePhotoRow(root, (id) => { state.photoIds.push(id); rerender(); });
    fillPhotoImages(root);
    const closeBtn = root.querySelector('[data-action="close-task"]');
    closeBtn.addEventListener('click', async () => {
      if (!canClose()) return;
      closeBtn.disabled = true;
      const wasActingUser = state.completedByUserId;
      if (wasActingUser !== store.state.session.actingUserId) await store.changeActingUser(wasActingUser);
      const readings = evaluatedReadings().map((r) => ({ key: r.key, label: r.label, value: r.value, inRange: r.inRange }));
      await store.closeTask({ taskId, readings, photoIds: state.photoIds, note: state.note, outcome: 'pass' });
      navigate('today');
    });
  }

  function updateCloseBtn() {
    const btn = root.querySelector('[data-action="close-task"]');
    if (btn) btn.disabled = !canClose();
  }

  function rerender(preserveFocus = false) {
    const activeReadingKey = preserveFocus && document.activeElement && document.activeElement.dataset.reading;
    root.innerHTML = render();
    wire();
    if (activeReadingKey) {
      const el = root.querySelector(`[data-reading="${activeReadingKey}"]`);
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }

  rerender();
  return () => {};
}
