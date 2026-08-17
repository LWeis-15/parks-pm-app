let current = null;

export function showToast(message, { actionLabel = 'Undo', onAction = null, duration = 5000 } = {}) {
  if (current) current.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${message}</span>${onAction ? `<button type="button">${actionLabel}</button>` : ''}`;
  document.body.appendChild(el);
  current = el;
  const timer = setTimeout(() => { el.remove(); if (current === el) current = null; }, duration);
  if (onAction) {
    el.querySelector('button').addEventListener('click', () => {
      clearTimeout(timer);
      el.remove();
      if (current === el) current = null;
      onAction();
    });
  }
  return () => { clearTimeout(timer); el.remove(); if (current === el) current = null; };
}
