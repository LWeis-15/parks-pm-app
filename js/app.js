import * as store from './store.js';
import { current, onChange, navigate } from './router.js';
import { personaSwitch, wirePersonaSwitch } from './components/ui.js';

import * as today from './screens/today.js';
import * as mywork from './screens/mywork.js';
import * as rom from './screens/rom.js';
import * as assetsList from './screens/assets-list.js';
import * as assetRecord from './screens/asset-record.js';
import * as issues from './screens/issues.js';
import * as program from './screens/program.js';
import * as queue from './screens/queue.js';
import * as closeout from './screens/closeout.js';
import * as closeoutFailed from './screens/closeout-failed.js';

const SCREENS = {
  today, mywork, rom, issues, program, queue,
  closeout, 'closeout-failed': closeoutFailed,
};

const appEl = document.getElementById('app');
const personaEl = document.getElementById('persona-root');

let unmountCurrent = null;

function mountRoute({ base, params }) {
  if (unmountCurrent) { unmountCurrent(); unmountCurrent = null; }
  if (base === 'assets') {
    unmountCurrent = params.length ? assetRecord.mount(appEl, params) : assetsList.mount(appEl, params);
    return;
  }
  const mod = SCREENS[base];
  if (!mod) { navigate('today'); return; }
  unmountCurrent = mod.mount(appEl, params);
}

function renderPersona() {
  personaEl.innerHTML = personaSwitch(store.state.session.persona);
  wirePersonaSwitch(personaEl, async (p) => {
    await store.setPersona(p);
    navigate(p === 'tech' ? 'today' : (p === 'fm' ? 'mywork' : 'rom'));
    renderPersona();
  });
}

async function boot() {
  await store.init();
  renderPersona();
  store.subscribe(() => renderPersona());
  onChange(mountRoute);
  mountRoute(current());
}

boot();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
