export const ASSEMBLY_STAGGER = 0.42;
export const ASSEMBLY_DURATION = 0.9;
export const SCRUB_WINDOW = 0.28;
export const ACCENT_HEX = 0xffd21f;
export const WHEEL_OUT = 1.55;
export const BRAKE_OUT = 0.8;

export const ASSEMBLY_STEPS = [
  { key: 'chassis', label: 'Lower chassis & floor' },
  { key: 'engine', label: 'Engine assembly' },
  { key: 'wheels', label: 'Tires' },
  { key: 'wheels', label: 'Forged rims' },
  { key: 'brakes', label: 'Brake discs & calipers' },
  { key: 'interior', label: 'Interior & steering' },
  { key: 'body', label: 'Lower shell panels' },
  { key: 'body', label: 'Upper body shell' },
  { key: 'body', label: 'Hood & aero panels' },
  { key: 'body', label: 'Side mirrors' },
  { key: 'body', label: 'Engine cover' },
  { key: 'glass', label: 'Glass & windows' },
  { key: 'headlights', label: 'LED headlights' },
  { key: 'taillights', label: 'LED taillights' },
  { key: 'grilles', label: 'Intakes & vents' },
  { key: 'chrome', label: 'Badges & trim' },
];

export const CAR_PARTS = [
  { key: 'chassis', label: 'Chassis tub', order: 0 },
  { key: 'wheels', label: 'Forged wheels ×4', order: 1 },
  { key: 'brakes', label: 'Carbon-ceramic brakes', order: 2 },
  { key: 'interior', label: 'Interior & steering', order: 3 },
  { key: 'body', label: 'Body shell', order: 4 },
  { key: 'glass', label: 'Glass & wipers', order: 5 },
  { key: 'headlights', label: 'LED headlights', order: 6 },
  { key: 'taillights', label: 'LED taillights', order: 7 },
  { key: 'grilles', label: 'Honeycomb grilles', order: 8 },
  { key: 'chrome', label: 'Chrome & exhaust trim', order: 9 },
  { key: 'engine', label: 'Engine & turbo assembly', order: 10 },
];

export const NODE_MAP = {
  metal: { part: 'chassis', offset: [0, -1.25, 0] },
  plastic_gray: { part: 'chassis', offset: [0, -1.25, 0] },
  carpet: { part: 'chassis', offset: [0, -1.25, 0] },
  interior_dark: { part: 'chassis', offset: [0, -1.25, 0] },
  brakes: { part: 'brakes', offset: [0, 0.9, 0] },
  leather: { part: 'interior', offset: [0, 2.1, 0] },
  interior_light: { part: 'interior', offset: [0, 2.1, 0] },
  trim: { part: 'interior', offset: [0, 2.1, 0] },
  blue: { part: 'interior', offset: [0, 2.1, 0] },
  steering_wheel: { part: 'interior', offset: [0, 2.35, 0] },
  body: { part: 'body', offset: [0, 1.45, 0] },
  carbon_fibre_trim: { part: 'body', offset: [0, 1.45, 0] },
  'carbon fibre': { part: 'body', offset: [0, 1.45, 0] },
  yellow_trim: { part: 'body', offset: [0, 1.45, 0] },
  glass: { part: 'glass', offset: [0, 2.75, -0.2] },
  wipers: { part: 'glass', offset: [0, 2.75, -0.6] },
  lights: { part: 'headlights', offset: [0, 0.45, -1.9] },
  leds: { part: 'headlights', offset: [0, 0.45, -1.9] },
  lights_red: { part: 'taillights', offset: [0, 0.45, 1.9] },
  grills: { part: 'grilles', offset: [0, -0.35, -1.5] },
  chrome: { part: 'chrome', offset: [0, -0.3, 1.6] },
};

export const TOTAL_ASSEMBLY = (ASSEMBLY_STEPS.length - 1) * ASSEMBLY_STAGGER + ASSEMBLY_DURATION;

const easeOutCubic = (p) => 1 - (1 - p) ** 3;
const easeInOutCubic = (p) => p < 0.5 ? 4 * p ** 3 : 1 - ((-2 * p + 2) ** 3) / 2;

export function explodeFactor(sim, order, now) {
  if (sim.phase === 'assembled') return 0;
  if (sim.phase === 'exploded') return 1;
  if (sim.phase === 'scrubbed') {
    const start = (order / (ASSEMBLY_STEPS.length - 1)) * (1 - SCRUB_WINDOW);
    return easeInOutCubic(Math.min(1, Math.max(0, (sim.progress - start) / SCRUB_WINDOW)));
  }
  const elapsed = (now - sim.start) / 1000;
  if (elapsed >= TOTAL_ASSEMBLY) return sim.phase === 'assembling' ? 0 : 1;
  const progress = Math.min(1, Math.max(0, (elapsed - order * ASSEMBLY_STAGGER) / ASSEMBLY_DURATION));
  return sim.phase === 'assembling' ? 1 - easeOutCubic(progress) : easeInOutCubic(progress);
}
