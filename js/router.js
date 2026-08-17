const listeners = new Set();

export function navigate(path) {
  if (location.hash.slice(1) !== path) location.hash = path;
  else listeners.forEach((fn) => fn(current()));
}

export function current() {
  const raw = location.hash.slice(1) || '/today';
  const [base, ...rest] = raw.split('/').filter(Boolean);
  return { base: base || 'today', params: rest };
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

window.addEventListener('hashchange', () => {
  const c = current();
  listeners.forEach((fn) => fn(c));
});
