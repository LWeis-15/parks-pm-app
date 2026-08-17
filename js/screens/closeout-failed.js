import * as store from '../store.js';
import { icon } from '../icons.js';
import { photoRow, fillPhotoImages, wirePhotoRow } from '../components/photos.js';
import { signaturePad, wireSignaturePad } from '../components/signature.js';
import { navigate } from '../router.js';

const SAFETY_CATEGORIES = ['Playgrounds', 'Pools/Splash Pads', 'Wastewater/Septic'];

// Persists across the three steps of one attempt (in-memory only).
let wizard = null;

function freshWizard(task) {
  const safetyDefault = SAFETY_CATEGORIES.includes(task.category);
  return {
    taskId: task.id,
    photoIds: [],
    failed: new Set(),
    outOfServiceNote: '',
    priority: safetyDefault ? 'safety' : 'routine',
    notify: safetyDefault,
    ownerId: 'u_druiz',
    hasSignature: false,
    completedByUserId: store.state.session.actingUserId,
  };
}

function segmentHtml(step) {
  return `<div class="step-segments">${[1, 2, 3].map((n) => `<div class="step-segment ${n <= step ? 'filled' : ''}"></div>`).join('')}</div>`;
}

function stepHeader(step, { canGoNext, onCancel, onNext, onBack }) {
  const left = step === 1
    ? `<span class="step-btn" data-action="cancel">Cancel</span>`
    : `<span class="step-btn" data-action="back">Back</span>`;
  return `
    <div class="step-hdr">
      <div class="step-hdr-row">
        ${left}
        <span class="step-count">STEP ${step} OF 3</span>
        <span class="step-btn ${canGoNext ? '' : 'disabled'}" data-action="next">${step === 3 ? '' : 'Next'}</span>
      </div>
      ${segmentHtml(step)}
    </div>`;
}

function draftTitle(task, failedList) {
  const asset = task.assetId ? store.getAsset(task.assetId) : null;
  const place = asset ? asset.location : (task.assetRefText || '');
  const short = failedList[0] ? failedList[0].replace(/^(Stretched or worn |Cracked |Loose )/, '').trim() : 'issue';
  return `Repair — ${task.task.replace(/^(Test|Check|Visual inspection for|Visual check of)\s*/i, '')}${place ? `, ${place}` : ''}`;
}

export function mount(root, params) {
  const taskId = Number(params[0]);
  const step = Number(params[1]) || 1;
  const task = store.getTask(taskId);
  if (!task) { navigate('today'); return () => {}; }
  if (!wizard || wizard.taskId !== taskId) wizard = freshWizard(task);

  function goto(n) { navigate(`closeout-failed/${taskId}/${n}`); }

  function renderStep1() {
    const canNext = wizard.photoIds.length > 0;
    return `
      ${stepHeader(1, { canGoNext: canNext })}
      <div class="sheet-body" style="padding:22px 20px 20px">
        <div class="section-label danger">DOES NOT MEET STANDARD</div>
        <div style="font:700 22px/1.25 var(--font-sans);color:var(--color-neutral-800);margin-top:8px">${task.task}</div>
        <div style="font:400 13px/1.5 var(--font-sans);color:var(--color-neutral-600);margin-top:8px">${task.category} · ${task.frequency.toLowerCase()}${task.assetId ? ' · ' + store.getAsset(task.assetId).name : ''}</div>
        <div class="section-label" style="margin-top:24px">PHOTO OF THE ISSUE — REQUIRED</div>
        ${photoRow(wizard.photoIds)}
      </div>`;
  }

  function renderStep2() {
    const opts = task.failureOptions && task.failureOptions.length ? task.failureOptions : ['Does not meet standard'];
    const canNext = wizard.failed.size > 0;
    const title = draftTitle(task, [...wizard.failed]);
    const dueDate = new Date(Date.now() + (wizard.priority === 'safety' ? 48 : 336) * 3600 * 1000);
    const dueLabel = dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const owner = store.getUser(wizard.ownerId);
    return `
      ${stepHeader(2, { canGoNext: canNext })}
      <div class="sheet-body" style="padding:22px 20px 20px">
        <div class="section-label danger">DOES NOT MEET STANDARD</div>
        <div style="font:700 22px/1.25 var(--font-sans);color:var(--color-neutral-800);margin-top:8px">${task.task}</div>
        <div style="font:400 13px/1.5 var(--font-sans);color:var(--color-neutral-600);margin-top:8px">${task.category} · ${task.frequency.toLowerCase()}${task.assetId ? ' · ' + store.getAsset(task.assetId).name : ''}</div>

        <div class="fail-container">
          <div class="lbl">WHAT FAILED</div>
          <div class="fail-list">
            ${opts.map((o) => `
              <button type="button" class="fail-row ${wizard.failed.has(o) ? 'checked' : ''}" data-fail="${o}">
                <span class="fail-check ${wizard.failed.has(o) ? 'checked' : ''}">${wizard.failed.has(o) ? icon('check', { size: 14, color: '#fff', strokeWidth: 3 }) : ''}</span>
                <span class="lbl-text">${o}</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="warn-banner neutral">
          <div style="margin-top:1px">${icon('alertTriangle', { size: 17, color: '#b3261e' })}</div>
          <textarea data-oos-note style="flex:1;border:0;background:transparent;font:400 12.5px/1.45 var(--font-sans);color:#3f4143;resize:vertical;min-height:36px" placeholder="Describe what's out of service (bays tagged out, area closed, etc.)">${wizard.outOfServiceNote}</textarea>
        </div>

        <div class="section-label" style="margin-top:24px">WORK ORDER — AUTO-DRAFTED</div>
        <div class="wo-card">
          <div class="wo-field">
            <div class="k">TITLE</div>
            <input type="text" data-wo-title value="${wizard.woTitle ?? title}">
          </div>
          <div class="wo-2col">
            <div class="wo-field"><div class="k">OWNER</div><div class="v">${owner.name} — ${owner.role}</div></div>
            <div class="wo-field"><div class="k">DUE</div><div class="v">${dueLabel}</div></div>
          </div>
          <div class="wo-priority-row">
            <span style="font:600 11px var(--font-sans);letter-spacing:.05em;color:var(--color-neutral-400)">PRIORITY</span>
            <button type="button" class="wo-priority-pill ${wizard.priority === 'safety' ? 'selected safety' : ''}" data-priority="safety">SAFETY — 48 HR</button>
            <button type="button" class="wo-priority-pill ${wizard.priority === 'routine' ? 'selected routine' : ''}" data-priority="routine">Routine — 14 day</button>
          </div>
        </div>

        <div class="notify-row" data-action="toggle-notify">
          <span class="box ${wizard.notify ? '' : 'off'}">${wizard.notify ? icon('check', { size: 14, color: '#fff', strokeWidth: 3 }) : ''}</span>
          <span class="lbl">Notify GM and ROM — ${task.category.toLowerCase()} safety item</span>
        </div>
      </div>`;
  }

  function renderStep3() {
    const user = store.getUser(wizard.completedByUserId);
    return `
      ${stepHeader(3, { canGoNext: wizard.hasSignature })}
      <div class="sheet-body" style="padding:22px 20px 20px">
        <div class="section-label">SIGN OFF</div>
        <div style="font:700 19px/1.25 var(--font-sans);color:var(--color-neutral-800);margin-top:8px">${task.task}</div>
        <div style="font:400 13px/1.5 var(--font-sans);color:var(--color-neutral-600);margin-top:8px">Failed: ${[...wizard.failed].join(', ')}</div>

        <div class="section-label" style="margin-top:22px">COMPLETED BY</div>
        <div class="completed-by">
          <div class="avatar">${user.initials}</div>
          <div class="who">
            <div class="name">${user.name}</div>
            <div class="role">${user.role}${user.certification ? ' · ' + user.certification : ''}</div>
          </div>
          <button type="button" class="change" data-action="toggle-change-user">Change</button>
        </div>
        ${wizard.changingUser ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:6px;background:var(--color-neutral-50);border-radius:12px;padding:8px">
          ${store.state.users.map((u) => `<button type="button" data-pick-user="${u.id}" style="text-align:left;border:0;background:${u.id === wizard.completedByUserId ? 'var(--color-mist)' : 'transparent'};padding:8px 10px;border-radius:8px;font:600 13px var(--font-sans);color:var(--color-neutral-800);cursor:pointer">${u.name} <span style="font-weight:400;color:var(--color-fg-muted)">· ${u.role}</span></button>`).join('')}
        </div>` : ''}

        <div class="section-label" style="margin-top:22px">SIGNATURE</div>
        ${signaturePad(wizard.hasSignature)}
      </div>`;
  }

  function render() {
    const body = step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3();
    const footer = step < 3
      ? `<div class="sheet-footer"><button class="btn btn-footer sm" data-action="footer-next" ${step === 1 ? (wizard.photoIds.length ? '' : 'disabled') : (wizard.failed.size ? '' : 'disabled')}>Continue${step === 2 ? ' to sign-off' : ''}</button></div>`
      : `<div class="sheet-footer"><button class="btn btn-footer sm" data-action="submit" ${wizard.hasSignature ? '' : 'disabled'}>Submit closure &middot; queue for sync</button></div>`;
    return `<div class="sheet-backdrop"><div class="sheet" style="border-radius:0">${body}${footer}</div></div>`;
  }

  function wire() {
    const cancel = root.querySelector('[data-action="cancel"]');
    if (cancel) cancel.addEventListener('click', () => { wizard = null; navigate('today'); });
    const back = root.querySelector('[data-action="back"]');
    if (back) back.addEventListener('click', () => goto(step - 1));
    const next = root.querySelector('[data-action="next"]');
    if (next && !next.classList.contains('disabled')) next.addEventListener('click', () => goto(step + 1));
    const footerNext = root.querySelector('[data-action="footer-next"]');
    if (footerNext) footerNext.addEventListener('click', () => { if (!footerNext.disabled) goto(step + 1); });

    if (step === 1) {
      wirePhotoRow(root, (id) => { wizard.photoIds.push(id); rerender(); });
      fillPhotoImages(root);
    }
    if (step === 2) {
      root.querySelectorAll('[data-fail]').forEach((btn) => btn.addEventListener('click', () => {
        const v = btn.dataset.fail;
        if (wizard.failed.has(v)) wizard.failed.delete(v); else wizard.failed.add(v);
        rerender();
      }));
      const oos = root.querySelector('[data-oos-note]');
      if (oos) oos.addEventListener('input', (e) => { wizard.outOfServiceNote = e.target.value; });
      const woTitle = root.querySelector('[data-wo-title]');
      if (woTitle) woTitle.addEventListener('input', (e) => { wizard.woTitle = e.target.value; });
      root.querySelectorAll('[data-priority]').forEach((btn) => btn.addEventListener('click', () => {
        wizard.priority = btn.dataset.priority; rerender();
      }));
      const notifyRow = root.querySelector('[data-action="toggle-notify"]');
      if (notifyRow) notifyRow.addEventListener('click', () => { wizard.notify = !wizard.notify; rerender(); });
    }
    if (step === 3) {
      const toggleUser = root.querySelector('[data-action="toggle-change-user"]');
      if (toggleUser) toggleUser.addEventListener('click', () => { wizard.changingUser = !wizard.changingUser; rerender(); });
      root.querySelectorAll('[data-pick-user]').forEach((btn) => btn.addEventListener('click', () => {
        wizard.completedByUserId = btn.dataset.pickUser; wizard.changingUser = false; rerender();
      }));
      wireSignaturePad(root, (has) => {
        wizard.hasSignature = has;
        const btn = root.querySelector('[data-action="submit"]');
        if (btn) btn.disabled = !has;
        const nextBtn = root.querySelector('[data-action="next"]');
        if (nextBtn) nextBtn.classList.toggle('disabled', !has);
      });
      const submit = root.querySelector('[data-action="submit"]');
      if (submit) submit.addEventListener('click', async () => {
        if (!wizard.hasSignature) return;
        submit.disabled = true;
        const owner = store.getUser(wizard.ownerId);
        const dueDate = new Date(Date.now() + (wizard.priority === 'safety' ? 48 : 336) * 3600 * 1000).toISOString();
        if (wizard.completedByUserId !== store.state.session.actingUserId) await store.changeActingUser(wizard.completedByUserId);
        await store.closeTaskFailed({
          taskId,
          failedCriteria: [...wizard.failed],
          outOfServiceNote: wizard.outOfServiceNote,
          photoIds: wizard.photoIds,
          workOrderDraft: {
            title: wizard.woTitle ?? draftTitle(task, [...wizard.failed]),
            ownerId: wizard.ownerId, ownerName: owner.name, dueDate, priority: wizard.priority,
          },
          notifyGmRom: wizard.notify,
        });
        wizard = null;
        navigate('today');
      });
    }
  }

  function rerender() { root.innerHTML = render(); wire(); }
  rerender();
  return () => {};
}
