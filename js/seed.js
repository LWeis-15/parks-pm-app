// Source: Northgate Holdings — Facility Manager Preventive Maintenance Program
// (regional workbook) via design_handoff_parks_pm_app/Parks PM App.dc.html.
// Task/Standard/Role/Season/Est. Time text is verbatim from the workbook where
// the source provided it. Fields the source prototype did not specify for a
// given row (est. minutes, exact season) are left `null` rather than invented —
// see README "the task list and standards are the fixed regional program."

export const CATEGORIES = [
  'Buildings', 'Grounds', 'Pools/Splash Pads', 'Wastewater/Septic',
  'Playgrounds', 'Roads/Parking', 'Equipment/Vehicles',
];

export const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'];
export const FREQUENCY_INTERVAL_DAYS = { Daily: 1, Weekly: 7, Monthly: 30, Quarterly: 91, Annual: 365 };

export const PARK = { code: 'JLV', name: 'JELLYSTONE LURAY', state: 'VA' };

// Pool chemical code ranges are per-state, driven by the park's state — not
// hardcoded into app logic. Only VA's range is sourced from the workbook; the
// rest are placeholders (copies of VA) flagged for the region to supply real
// per-state figures before this ships. See README "Open Decisions," item 5.
export const STATE_POOL_CODE_RANGES = {
  VA: { freeChlorine: { min: 1.0, max: 5.0, unit: 'ppm' }, ph: { min: 7.2, max: 7.8, unit: '' } },
  IN: { freeChlorine: { min: 1.0, max: 5.0, unit: 'ppm' }, ph: { min: 7.2, max: 7.8, unit: '' }, _placeholder: true },
  MD: { freeChlorine: { min: 1.0, max: 5.0, unit: 'ppm' }, ph: { min: 7.2, max: 7.8, unit: '' }, _placeholder: true },
  PA: { freeChlorine: { min: 1.0, max: 5.0, unit: 'ppm' }, ph: { min: 7.2, max: 7.8, unit: '' }, _placeholder: true },
  NC: { freeChlorine: { min: 1.0, max: 5.0, unit: 'ppm' }, ph: { min: 7.2, max: 7.8, unit: '' }, _placeholder: true },
  MI: { freeChlorine: { min: 1.0, max: 5.0, unit: 'ppm' }, ph: { min: 7.2, max: 7.8, unit: '' }, _placeholder: true },
};

export const OTHER_PARKS = [
  { code: 'BAR', state: 'IN' },
  { code: 'JGV', state: 'IN' },
  { code: 'JMD', state: 'MD' },
  { code: 'JQV', state: 'PA' },
  { code: 'JWV', state: 'NC' },
  { code: 'LNP', state: 'MI' },
];

// Static regional-rollup snapshot for parks other than this device's home
// park (JLV) — represents the last server sync, not live local data, since a
// single park's device only carries its own operational data offline.
export const ROM_PARK_SNAPSHOT = {
  JQV: { pct: 71, note: '5 overdue · wastewater and paving', overdueCount: 5 },
  JMD: { pct: 84, note: '1 overdue · quarterly road survey', overdueCount: 1 },
  BAR: { pct: 90, note: 'All daily and weekly current', overdueCount: 0 },
  JGV: { pct: 92, note: '3 due within 7 days', overdueCount: 0 },
  JWV: { pct: 95, note: 'Annual playground audit filed', overdueCount: 0 },
  LNP: { pct: 97, note: 'Full program current', overdueCount: 0 },
};

export const ROM_OVERDUE_OTHER_PARKS = [
  { park: 'JQV', category: 'WASTEWATER/SEPTIC', daysLate: 12, task: 'Effluent sampling per permit requirements', who: 'Licensed Wastewater Operator · permit condition, escalate to vendor' },
  { park: 'JQV', category: 'PLAYGROUNDS', daysLate: 8, task: 'Full hardware torque-check on bolts and fasteners', who: 'Maintenance Tech · no name on the last three closures' },
  { park: 'JMD', category: 'ROADS/PARKING', daysLate: 5, task: 'Full road condition survey', who: 'Facilities Manager · 90 min, needs a scheduled block' },
];

export const USERS = [
  { id: 'u_marcus', name: 'Marcus Ellery', role: 'Maintenance Tech', certification: 'Certified Pool Operator · CPO #41-8827', initials: 'ME' },
  { id: 'u_dana', name: 'Dana', role: 'Facilities Manager', certification: null, initials: 'D' },
  { id: 'u_druiz', name: 'D. Ruiz', role: 'Maintenance Lead', certification: null, initials: 'DR' },
  { id: 'u_lweis', name: 'L. Weis', role: 'Regional Operations Manager', certification: 'Region 4', initials: 'LW' },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// ---- Assets (Asset Register tab) ----------------------------------------
export const ASSETS = [
  {
    id: 'a_pool_pump', category: 'Pools/Splash Pads', name: 'Main Pool Pump',
    manufacturerModel: 'Pentair WhisperFlo', location: 'Main Pool Equipment Room', parkCode: 'JLV',
    installDate: '2019-03-15', expectedServiceLifeYears: 10, notes: '',
    vendorTrail: [
      { title: 'Aqua Systems Inc. — annual service', date: '2026-04-22', detail: 'report filed · impeller cleaned, seals within spec' },
      { title: 'Shaft seal kit replaced', date: '2025-07-09', detail: '$186 · Pentair OEM' },
      { title: 'Motor bearing noise investigated', date: '2025-06-02', detail: 'no fault found · monitored two weeks' },
    ],
  },
  {
    id: 'a_lift_station_pump', category: 'Wastewater/Septic', name: 'Lift Station Pump #1',
    manufacturerModel: 'Gorman-Rupp T4', location: 'Lift Station A', parkCode: 'JLV',
    installDate: '2020-01-01', expectedServiceLifeYears: 12, notes: '', vendorTrail: [],
  },
  {
    id: 'a_mower', category: 'Equipment/Vehicles', name: 'Zero-Turn Mower #1',
    manufacturerModel: 'Toro Z Master 5000', location: 'Maintenance Shop', parkCode: 'JLV',
    installDate: '2022-03-01', expectedServiceLifeYears: 8, notes: '', vendorTrail: [],
  },
  {
    id: 'a_playground', category: 'Playgrounds', name: 'Main Playground Structure',
    manufacturerModel: 'GameTime PrimeTime', location: 'Central Playground', parkCode: 'JLV',
    installDate: '2018-05-01', expectedServiceLifeYears: 20, notes: '', vendorTrail: [],
  },
  {
    id: 'a_hvac', category: 'Buildings', name: 'Comfort Station HVAC Unit',
    manufacturerModel: 'Carrier 24ACC6', location: 'Comfort Station #2', parkCode: 'JLV',
    installDate: '2021-06-01', expectedServiceLifeYears: 15, notes: '', vendorTrail: [],
  },
];

// ---- Tasks (fixed regional program — not park-editable) ------------------
// status is never stored; only lastCompleted / scheduledDate feed the calc engine.
export const TASKS = [
  { id: 1, category: 'Wastewater/Septic', task: 'Check lift station alarm panel for faults', standard: 'No active alarms; any fault logged and escalated to vendor same day', responsibleRole: 'Maintenance Tech', estMinutes: 5, season: 'Year-Round', frequency: 'Daily', assetId: 'a_lift_station_pump', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(2) },
  { id: 2, category: 'Pools/Splash Pads', task: 'Visual check of spray field/discharge area', standard: 'No surfacing effluent, ponding, or odor at discharge area', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 10, season: 'Year-Round', frequency: 'Daily', assetId: null, assetRefText: 'Spray Field North', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(1) },
  { id: 3, category: 'Pools/Splash Pads', task: 'Test and log chemical levels (chlorine, pH) — AM and PM', standard: 'Readings within state code range, logged on chemical log sheet', responsibleRole: 'Certified Pool Operator', estMinutes: 15, season: 'Summer Only', frequency: 'Daily', assetId: 'a_pool_pump', proofRequirements: { photo: true, readings: ['freeChlorine', 'ph'], note: false }, lastCompleted: daysAgo(1) },
  { id: 4, category: 'Pools/Splash Pads', task: 'Visual inspection for debris and hazards', standard: 'Pool/deck free of glass, debris, or slip hazards before opening', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 10, season: 'Summer Only', frequency: 'Daily', assetId: null, assetRefText: 'Main Pool Deck', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: null },
  { id: 5, category: 'Pools/Splash Pads', task: 'Check pump and filter operation', standard: 'Pump primed, pressure gauge in normal range, no unusual noise', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 10, season: 'Summer Only', frequency: 'Daily', assetId: 'a_pool_pump', proofRequirements: { photo: false, readings: [], note: true }, lastCompleted: daysAgo(1) },
  { id: 6, category: 'Pools/Splash Pads', task: 'Skim surface and empty skimmer baskets', standard: 'Surface clear of debris, baskets emptied', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 10, season: 'Summer Only', frequency: 'Daily', assetId: null, assetRefText: 'Main Pool', proofRequirements: { photo: false, readings: [], note: false }, lastCompleted: daysAgo(1) },
  { id: 7, category: 'Buildings', task: 'Restroom/shower cleanliness and function walkthrough', standard: 'All fixtures operating, no active leaks, floors dry and clean, supplies stocked', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 20, season: 'Year-Round', frequency: 'Daily', assetId: null, assetRefText: 'Comfort Station #2', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: null },
  { id: 8, category: 'Buildings', task: 'Exterior door and lock check on all public buildings', standard: 'Doors close and latch fully, locks engage, no forced-entry damage', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 10, season: 'Year-Round', frequency: 'Daily', assetId: null, assetRefText: 'All public buildings', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(1) },
  { id: 9, category: 'Buildings', task: 'Test emergency lighting and exit signage', standard: 'All units illuminate on battery test; dead units replaced same week', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 20, season: 'Year-Round', frequency: 'Daily', assetId: null, assetRefText: 'Lodge + comfort stations', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(3) },
  { id: 10, category: 'Playgrounds', task: 'Visual inspection for broken equipment or protruding hardware', standard: 'No broken components, exposed bolts, or debris in fall zones', responsibleRole: 'Maintenance Tech', estMinutes: 10, season: 'Year-Round', frequency: 'Daily', assetId: 'a_playground', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(1) },
  { id: 11, category: 'Grounds', task: 'Site hookup check (water/sewer/electric) for visible damage', standard: 'No cracked risers, exposed wiring, or leaking connections at occupied sites', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 30, season: 'Growing Season', frequency: 'Daily', assetId: null, assetRefText: 'Loops A–D', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(1) },
  { id: 12, category: 'Roads/Parking', task: 'Visual check for new potholes/hazards on primary access roads', standard: 'No unmarked hazards on roads used for guest check-in/check-out', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 15, season: 'Year-Round', frequency: 'Daily', assetId: null, assetRefText: 'Main entry road', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(1) },
  { id: 13, category: 'Equipment/Vehicles', task: 'Pre-use inspection (fluids, tires, brakes, visible damage)', standard: 'Inspection logged before first use of the day; unsafe units tagged out', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 10, season: 'Year-Round', frequency: 'Daily', assetId: 'a_mower', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: null },

  { id: 14, category: 'Playgrounds', task: 'Test swing chains and seat attachment hardware', standard: 'No stretched links, cracked seats, or loose attachment points', responsibleRole: 'Maintenance Tech', estMinutes: null, season: 'Year-Round', frequency: 'Weekly', assetId: 'a_playground', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(8),
    failureOptions: ['Stretched or worn chain links', 'Cracked seat', 'Loose attachment point'] },

  { id: 15, category: 'Wastewater/Septic', task: 'Effluent sampling per permit requirements', standard: 'Sample collected and submitted per discharge permit schedule; results filed', responsibleRole: 'Licensed Wastewater Operator', estMinutes: null, season: 'Year-Round', frequency: 'Quarterly', assetId: null, assetRefText: 'Spray Field North', proofRequirements: { photo: false, readings: [], note: true }, lastCompleted: daysAgo(97) },

  { id: 16, category: 'Pools/Splash Pads', task: 'Backwash filters', standard: 'Filter pressure returned to normal operating range after backwash, logged', responsibleRole: 'Maintenance Tech / Grounds Crew', estMinutes: 20, season: 'Summer Only', frequency: 'Weekly', assetId: 'a_pool_pump', proofRequirements: { photo: false, readings: [], note: true }, lastCompleted: daysAgo(3) },
  { id: 17, category: 'Pools/Splash Pads', task: 'Deep clean filter media/cartridges', standard: 'Filter media free of buildup; flow restored to rated capacity', responsibleRole: 'Pool Operator', estMinutes: null, season: 'Summer Only', frequency: 'Monthly', assetId: 'a_pool_pump', proofRequirements: { photo: true, readings: [], note: false }, lastCompleted: daysAgo(26) },
  { id: 18, category: 'Pools/Splash Pads', task: 'Inspect pump motor and seals', standard: 'No leaks at seal, motor amperage within nameplate spec, mounting secure', responsibleRole: 'Pool Maintenance Vendor', estMinutes: null, season: 'Summer Only', frequency: 'Quarterly', assetId: 'a_pool_pump', proofRequirements: { photo: false, readings: [], note: true }, lastCompleted: null, scheduledDate: daysFromNow(16) },
  { id: 19, category: 'Pools/Splash Pads', task: 'Professional service on heaters and pumps', standard: 'Full-service report on file; parts replaced per vendor recommendation', responsibleRole: 'Aqua Systems Inc.', estMinutes: null, season: 'Summer Only', frequency: 'Annual', assetId: 'a_pool_pump', proofRequirements: { photo: false, readings: [], note: true }, lastCompleted: '2026-04-22T09:00:00.000Z' },
];

// The three tasks already closed before the tech opens the app this morning —
// mirrors the prototype's initial "3 of 13 closed" state (ids 4, 7, 13).
export const PRESEEDED_CLOSURES = [
  { taskId: 4, hoursAgo: 2.7, note: '', outcome: 'pass' },
  { taskId: 7, hoursAgo: 3.0, note: '', outcome: 'pass' },
  { taskId: 13, hoursAgo: 2.9, note: '', outcome: 'pass' },
];

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
