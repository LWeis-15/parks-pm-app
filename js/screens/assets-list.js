import * as store from '../store.js';
import { servicelifePct, toneForLifePct } from '../calc.js';
import { icon } from '../icons.js';
import { tabBar } from '../components/ui.js';
import { navigate } from '../router.js';

let search = '';
let activeCat = 'All';

export function mount(root) {
  function rerender() {
    const cats = ['All', ...new Set(store.state.assets.map((a) => a.category))];
    const decorated = store.state.assets.map((a) => {
      const life = servicelifePct(a);
      return { a, life, tasksCount: store.tasksForAsset(a.id).length };
    }).sort((x, y) => (y.life?.pct ?? 0) - (x.life?.pct ?? 0));

    const filtered = decorated.filter(({ a }) => {
      if (activeCat !== 'All' && a.category !== activeCat) return false;
      if (search && !(`${a.name} ${a.manufacturerModel} ${a.location}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });

    const anyAdvisory = decorated.some(({ life }) => life && life.pct >= 70);

    root.innerHTML = `
      <div class="screen">
        <div class="hdr hdr--white">
          <div class="hdr-eyebrow on-white">${store.state.session.parkCode} · ${store.state.session.parkName}</div>
          <div class="hdr-title--lg" style="color:var(--color-neutral-800)">Asset Register</div>
          <div class="search-box">
            ${icon('search', { size: 17, color: '#939598' })}
            <input type="text" placeholder="Search assets, models or locations" data-search value="${search}">
          </div>
          <div class="chip-row">
            ${cats.map((c) => `<span class="chip ${c === activeCat ? 'active' : ''}" data-cat="${c}">${c === 'All' ? `All ${store.state.assets.length}` : c}</span>`).join('')}
          </div>
        </div>
        <div class="scroll" style="padding:14px 14px 40px">
          ${anyAdvisory ? `<div class="warn-banner">
            <div style="margin-top:1px">${icon('alertCircle', { size: 17, color: '#a07d2b' })}</div>
            <div class="txt">At least one asset is past 70% of its expected service life. Flag it in next year's capital request.</div>
          </div>` : ''}
          <div class="section-label" style="padding:${anyAdvisory ? '20px' : '6px'} 0 10px 4px">SERVICE LIFE SPENT · HIGHEST FIRST</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${filtered.length ? filtered.map(({ a, life, tasksCount }) => {
              const tone = life ? toneForLifePct(life.pct) : 'var(--color-neutral-400)';
              return `<div class="asset-card" data-nav-asset="${a.id}">
                <div class="top">
                  <span class="cat-caps">${a.category}</span>
                  <span style="font:700 11px var(--font-sans);letter-spacing:.05em;color:${tone}">${life ? `${life.ageYears.toFixed(1)} of ${a.expectedServiceLifeYears} yrs` : '—'}</span>
                </div>
                <div class="name">${a.name}</div>
                <div class="sub">${a.manufacturerModel} · ${a.location}</div>
                <div class="track"><div class="progress-fill" style="width:${life ? Math.min(100, life.pct) : 0}%;background:${tone}"></div></div>
                <div class="tied">${tasksCount} PM TASK${tasksCount === 1 ? '' : 'S'} TIED TO THIS ASSET</div>
              </div>`;
            }).join('') : `<div class="empty-state"><div class="icon">${icon('home', { size: 40 })}</div><div class="title">No assets match</div><div class="body">Try a different search or category filter.</div></div>`}
          </div>
        </div>
      </div>
      ${tabBar('assets')}`;

    root.querySelector('[data-search]').addEventListener('input', (e) => { search = e.target.value; rerender(); e.target.focus(); e.target.setSelectionRange(search.length, search.length); });
    root.querySelectorAll('[data-cat]').forEach((el) => el.addEventListener('click', () => { activeCat = el.dataset.cat; rerender(); }));
    root.querySelectorAll('[data-nav-asset]').forEach((el) => el.addEventListener('click', () => navigate(`assets/${el.dataset.navAsset}`)));
  }
  rerender();
  const unsub = store.subscribe(rerender);
  return () => unsub();
}
