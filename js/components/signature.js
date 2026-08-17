export function signaturePad(hasSignature) {
  return `
    <div style="border:1px solid var(--color-neutral-200);border-radius:12px;overflow:hidden;margin-top:11px;position:relative">
      <canvas data-sig-canvas width="360" height="140" style="width:100%;height:140px;display:block;touch-action:none;background:#fff"></canvas>
      ${!hasSignature ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:400 13px var(--font-sans);color:var(--color-neutral-300);pointer-events:none">Sign here</div>' : ''}
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:6px">
      <button type="button" data-action="clear-sig" style="border:0;background:none;color:var(--color-teal-600);font:600 12px var(--font-sans);cursor:pointer">Clear</button>
    </div>`;
}

export function wireSignaturePad(root, onChange) {
  const canvas = root.querySelector('[data-sig-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / canvas.getBoundingClientRect().width || 1;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#262829';
  let drawing = false;
  let hasDrawn = false;

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasDrawn) { hasDrawn = true; onChange(true); }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => canvas.addEventListener(ev, () => { drawing = false; }));

  const clearBtn = root.querySelector('[data-action="clear-sig"]');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
    onChange(false);
  });
}
