// Grow-a-plant simulator. Each tick advances crop.grow.days / TICKS real days.
// The disease model is a simplified version of real epidemiology: every disease
// has a temperature window, a humidity threshold, a leaf-wetness weight and,
// for viruses, an insect vector. Pressure builds while conditions suit it and
// the disease breaks out once pressure reaches 1.

import {
  CROP_INDEX,
  KIND_LABEL,
  VECTORS,
  type Condition,
  type Crop,
  type Lang,
  type SeasonId,
  type Text,
  type Vector,
} from '../data/crops';

export const TICKS = 60;

export interface Weather {
  temp: number; // °C
  hum: number; // %
  rain: number; // 0..3
}

export const SEASONS: Record<SeasonId, { name: Text; emoji: string; weather: Weather }> = {
  kharif: { name: { en: 'Monsoon (Kharif)', mr: 'पावसाळा (खरीप)' }, emoji: '🌧️', weather: { temp: 28, hum: 80, rain: 1 } },
  rabi: { name: { en: 'Winter (Rabi)', mr: 'हिवाळा (रब्बी)' }, emoji: '🌤️', weather: { temp: 20, hum: 60, rain: 0 } },
  summer: { name: { en: 'Summer', mr: 'उन्हाळा' }, emoji: '☀️', weather: { temp: 34, hum: 40, rain: 0 } },
};

export type ActionId = 'water' | 'drain' | 'fungicide' | 'copper' | 'neem' | 'prune';

export const ACTIONS: Record<ActionId, { emoji: string; cost: number; name: Text; tip: Text }> = {
  water: { emoji: '💧', cost: 0, name: { en: 'Water', mr: 'पाणी द्या' }, tip: { en: 'Wets the soil', mr: 'माती ओली होते' } },
  drain: { emoji: '🕳️', cost: 0, name: { en: 'Drain', mr: 'पाणी काढा' }, tip: { en: 'Removes extra water', mr: 'जास्तीचे पाणी निघते' } },
  fungicide: { emoji: '🧴', cost: 20, name: { en: 'Fungicide', mr: 'बुरशीनाशक' }, tip: { en: 'Stops fungus for a while', mr: 'काही काळ बुरशी थांबवते' } },
  copper: { emoji: '🧪', cost: 20, name: { en: 'Copper spray', mr: 'तांबे फवारणी' }, tip: { en: 'Slows bacteria', mr: 'जिवाणू कमी करते' } },
  neem: { emoji: '🌿', cost: 15, name: { en: 'Neem + traps', mr: 'निंबोळी + सापळे' }, tip: { en: 'Drives away insects', mr: 'कीटक दूर करते' } },
  prune: { emoji: '✂️', cost: 5, name: { en: 'Remove sick leaves', mr: 'रोगट पाने काढा' }, tip: { en: 'Cuts disease a little', mr: 'रोग थोडा कमी होतो' } },
};

export interface DiseaseState {
  pressure: number; // 0..1 build-up before symptoms
  severity: number; // 0..1 visible disease
}

export interface GameEvent {
  tick: number;
  kind: 'onset' | 'stage' | 'thirst' | 'flood' | 'bugs' | 'info';
  text: Text;
  conditionId?: string;
}

export interface GameState {
  cropId: string;
  season: SeasonId;
  tick: number;
  target: Weather; // what the player set
  weather: Weather; // today's actual weather
  nitrogen: number; // 0 low, 1 normal, 2 high
  moisture: number; // soil 0..1.3
  growth: number; // 0..1
  health: number; // 0..1
  healthSum: number;
  coins: number;
  vectors: Record<Vector, number>;
  diseases: Record<string, DiseaseState>;
  protect: Partial<Record<'fungicide' | 'copper' | 'neem', number>>;
  events: GameEvent[];
  result: null | { outcome: 'harvest' | 'lost'; yieldPct: number; stars: number };
}

export function newGame(cropId: string, season: SeasonId): GameState {
  const crop = CROP_INDEX.get(cropId)!;
  const w = SEASONS[season].weather;
  return {
    cropId,
    season,
    tick: 0,
    target: { ...w },
    weather: { ...w },
    nitrogen: 1,
    moisture: 0.6,
    growth: 0,
    health: 1,
    healthSum: 0,
    coins: 150,
    vectors: { whitefly: 0, aphid: 0, leafhopper: 0 },
    diseases: Object.fromEntries(crop.conditions.filter((c) => c.sim).map((c) => [c.id, { pressure: 0, severity: 0 }])),
    protect: {},
    events: [],
    result: null,
  };
}

// ---------- maths helpers ----------

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** 0 outside [min,max], 1 at opt, linear in between. */
export function tri(v: number, [min, opt, max]: [number, number, number]) {
  if (v <= min || v >= max) return 0;
  return v < opt ? (v - min) / (opt - min) : (max - v) / (max - opt);
}

function leafWetness(w: Weather) {
  return clamp(w.rain / 2 + (w.hum - 85) / 30);
}

function vectorTarget(v: Vector, w: Weather, nitrogen: number) {
  const dry = 1 - w.rain / 3;
  switch (v) {
    case 'whitefly':
      return tri(w.temp, [22, 31, 40]) * dry * clamp(1.3 - w.hum / 100);
    case 'aphid':
      return tri(w.temp, [12, 22, 32]) * dry;
    case 'leafhopper':
      return tri(w.temp, [22, 30, 36]) * clamp(w.hum / 90) * (0.6 + nitrogen * 0.25);
  }
}

/** Today's infection risk (0..1) for a disease under the given state. */
export function riskOf(c: Condition, s: Pick<GameState, 'weather' | 'moisture' | 'nitrogen' | 'vectors' | 'protect'>) {
  const sim = c.sim!;
  const w = s.weather;
  const temp = tri(w.temp, sim.temp);
  let moist: number;
  if (sim.kind === 'viral') moist = sim.vector ? s.vectors[sim.vector] : 0.3;
  else if (sim.kind === 'soil') moist = clamp((s.moisture - 0.55) / 0.45) * sim.wet + 0.15;
  else moist = clamp(Math.max(((w.hum - sim.hum) / (100 - sim.hum)) * 1.1, leafWetness(w) * sim.wet));
  let n = 1;
  if (sim.nitrogen === 1) n = 0.7 + s.nitrogen * 0.3;
  if (sim.nitrogen === -1) n = 1.3 - s.nitrogen * 0.3;
  let protect = 1;
  if (sim.kind === 'fungal' && s.protect.fungicide) protect = 0.15;
  if (sim.kind === 'bacterial' && s.protect.copper) protect = 0.3;
  return clamp(temp * moist * n * protect);
}

// ---------- the tick ----------

export function step(prev: GameState, rng = Math.random): GameState {
  if (prev.result) return prev;
  const crop = CROP_INDEX.get(prev.cropId)!;
  const s: GameState = structuredClone(prev);
  s.tick += 1;
  const events: GameEvent[] = [];

  // weather wobbles around what the player chose
  s.weather = {
    temp: s.target.temp + (rng() - 0.5) * 3,
    hum: clamp(s.target.hum + (rng() - 0.5) * 8, 10, 100),
    rain: s.target.rain >= 1 ? clamp(s.target.rain + (rng() - 0.5), 0, 3) : rng() < 0.05 ? 1 : s.target.rain,
  };

  // soil water
  const evap = 0.022 + Math.max(0, s.weather.temp - 18) * 0.0022 + (1 - s.weather.hum / 100) * 0.02;
  s.moisture = clamp(s.moisture + s.weather.rain * 0.06 - evap, 0, 1.3);
  const thirst = clamp((0.3 - s.moisture) / 0.3);
  const flooded = crop.id !== 'rice' && s.moisture > 1.05;
  if (thirst > 0.6 && prev.moisture >= 0.12) events.push(ev(s, 'thirst', { en: 'The soil is dry! Give some water. 💧', mr: 'माती कोरडी झाली! पाणी द्या. 💧' }));
  if (flooded && prev.moisture <= 1.05) events.push(ev(s, 'flood', { en: 'Too much water, the roots can’t breathe. Drain the field!', mr: 'पाणी खूप साचले, मुळांना हवा मिळत नाही. पाणी काढून टाका!' }));

  // insects
  for (const v of Object.keys(s.vectors) as Vector[]) {
    let target = vectorTarget(v, s.weather, s.nitrogen);
    if (s.protect.neem) target *= 0.15;
    const before = s.vectors[v];
    s.vectors[v] = clamp(before + (target - before) * 0.25);
    const matters = crop.conditions.some((c) => c.sim?.vector === v);
    if (matters && before < 0.45 && s.vectors[v] >= 0.45) {
      const info = VECTORS[v];
      events.push(ev(s, 'bugs', {
        en: `${info.emoji} ${info.name.en} are gathering. They love ${info.likes.en} and carry viruses!`,
        mr: `${info.emoji} ${info.name.mr} वाढत आहेत. त्यांना ${info.likes.mr} आवडते आणि ते विषाणू पसरवतात!`,
      }));
    }
  }

  // diseases
  let spared = 1; // fraction of the plant untouched by any disease
  for (const c of crop.conditions) {
    if (!c.sim) continue;
    const d = s.diseases[c.id];
    const risk = riskOf(c, s);
    if (d.severity === 0) {
      d.pressure = clamp(d.pressure + risk * 0.2 - 0.02);
      if (d.pressure >= 1) {
        d.severity = 0.08;
        events.push({ tick: s.tick, kind: 'onset', conditionId: c.id, text: onsetText(c) });
      }
    } else {
      const progressive = c.sim.kind === 'viral' || c.sim.kind === 'soil' ? 0.006 : 0;
      let grow = risk * 0.04 + progressive;
      if (c.sim.kind === 'fungal' && s.protect.fungicide) grow = -0.02;
      if (c.sim.kind === 'bacterial' && s.protect.copper) grow = -0.015;
      d.severity = clamp(d.severity + grow, 0.02);
    }
    spared *= 1 - d.severity;
  }

  for (const k of Object.keys(s.protect) as (keyof GameState['protect'])[]) {
    s.protect[k] = (s.protect[k] ?? 0) - 1;
    if (s.protect[k]! <= 0) delete s.protect[k];
  }

  // health + growth
  const target = clamp(1 - (1 - spared) * 0.85 - thirst * 0.5 - (flooded ? 0.3 : 0));
  s.health = clamp(s.health + (target - s.health) * 0.25);
  s.healthSum += s.health;
  const tempOk = 0.45 + 0.55 * tri(s.weather.temp, crop.grow.temp);
  const nBoost = [0.8, 1, 1.1][s.nitrogen];
  const stageBefore = stageOf(s.growth);
  s.growth = clamp(s.growth + (1 / TICKS) * tempOk * nBoost * (0.35 + 0.65 * s.health) * (1 - thirst * 0.7) * 1.25);
  const stageAfter = stageOf(s.growth);
  if (stageAfter !== stageBefore) events.push(ev(s, 'stage', STAGES[stageAfter].say));

  // end of season
  if (s.health < 0.1) {
    s.result = { outcome: 'lost', yieldPct: 0, stars: 0 };
  } else if (s.growth >= 1) {
    const avg = s.healthSum / s.tick;
    const yieldPct = Math.round(avg * s.health * 100);
    s.coins += Math.round(yieldPct * 1.5);
    s.result = { outcome: 'harvest', yieldPct, stars: yieldPct >= 80 ? 3 : yieldPct >= 55 ? 2 : 1 };
  }

  s.events = [...prev.events, ...events].slice(-30);
  return s;
}

export function act(prev: GameState, action: ActionId): GameState {
  const a = ACTIONS[action];
  if (prev.result || prev.coins < a.cost) return prev;
  const s: GameState = structuredClone(prev);
  s.coins -= a.cost;
  switch (action) {
    case 'water':
      s.moisture = clamp(s.moisture + 0.35, 0, 1.3);
      break;
    case 'drain':
      s.moisture = Math.min(s.moisture, 0.55);
      break;
    case 'fungicide':
    case 'copper':
    case 'neem':
      s.protect[action] = 10;
      if (action === 'neem') for (const v of Object.keys(s.vectors) as Vector[]) s.vectors[v] *= 0.4;
      break;
    case 'prune':
      for (const d of Object.values(s.diseases)) if (d.severity > 0) d.severity = Math.max(0.02, d.severity * 0.6);
      s.growth = Math.max(0, s.growth - 0.01);
      break;
  }
  return s;
}

function ev(s: GameState, kind: GameEvent['kind'], text: Text): GameEvent {
  return { tick: s.tick, kind, text };
}

function onsetText(c: Condition): Text {
  return {
    en: `Oh no! ${c.name.en} has appeared. ${whyText(c, 'en')}`,
    mr: `अरे! ${c.name.mr} दिसू लागला आहे. ${whyText(c, 'mr')}`,
  };
}

const MR_DIGITS = '०१२३४५६७८९';
const num = (n: number, lang: Lang) => (lang === 'mr' ? String(n).replace(/\d/g, (d) => MR_DIGITS[+d]) : String(n));

/** Plain-language explanation of what weather favours a disease. */
export function whyText(c: Condition, lang: Lang): string {
  const sim = c.sim!;
  const [lo, opt, hi] = sim.temp;
  const kind = KIND_LABEL[sim.kind][lang];
  if (lang === 'en') {
    const parts = [`${kind}: grows at ${lo}–${hi}°C (best ${opt}°C)`];
    if (sim.kind === 'viral' && sim.vector) parts.push(`spread by ${VECTORS[sim.vector].name.en.toLowerCase()}, which love ${VECTORS[sim.vector].likes.en}`);
    else if (sim.kind === 'soil') parts.push('lives in the soil and loves soggy, waterlogged ground');
    else {
      if (sim.hum) parts.push(`humidity above ${sim.hum}%`);
      if (sim.wet >= 0.6) parts.push('wet leaves from rain');
    }
    if (sim.nitrogen === 1) parts.push('too much nitrogen fertiliser makes it worse');
    if (sim.nitrogen === -1) parts.push('weak, under-fed plants get it more');
    return parts.join(', ') + '.';
  }
  const parts = [`${kind}: ${num(lo, 'mr')}–${num(hi, 'mr')}°से तापमानात वाढते (सर्वोत्तम ${num(opt, 'mr')}°से)`];
  if (sim.kind === 'viral' && sim.vector) parts.push(`${VECTORS[sim.vector].name.mr} हा रोग पसरवतात, त्यांना ${VECTORS[sim.vector].likes.mr} आवडते`);
  else if (sim.kind === 'soil') parts.push('जमिनीत राहते आणि पाणी साचलेल्या ओल्या जमिनीत वाढते');
  else {
    if (sim.hum) parts.push(`${num(sim.hum, 'mr')}% पेक्षा जास्त आर्द्रता`);
    if (sim.wet >= 0.6) parts.push('पावसाने ओली पाने');
  }
  if (sim.nitrogen === 1) parts.push('जास्त नत्र खतामुळे रोग वाढतो');
  if (sim.nitrogen === -1) parts.push('कमकुवत, कमी खत मिळालेल्या झाडांना जास्त होतो');
  return parts.join(', ') + '.';
}

export const STAGES: { at: number; name: Text; say: Text }[] = [
  { at: 0, name: { en: 'Seed', mr: 'बी' }, say: { en: 'The seed is in the soil.', mr: 'बी मातीत पेरले आहे.' } },
  { at: 0.06, name: { en: 'Sprout', mr: 'अंकुर' }, say: { en: 'A tiny sprout! 🌱', mr: 'छोटासा अंकुर आला! 🌱' } },
  { at: 0.25, name: { en: 'Young plant', mr: 'रोप' }, say: { en: 'Growing strong, new leaves every day.', mr: 'रोप छान वाढत आहे, रोज नवी पाने.' } },
  { at: 0.5, name: { en: 'Growing', mr: 'वाढ' }, say: { en: 'Half way there! Keep an eye on the leaves.', mr: 'अर्धा प्रवास झाला! पानांवर लक्ष ठेवा.' } },
  { at: 0.72, name: { en: 'Flowering', mr: 'फुलोरा' }, say: { en: 'Flowers! The crop is forming. 🌼', mr: 'फुले आली! पीक तयार होत आहे. 🌼' } },
  { at: 0.92, name: { en: 'Almost ready', mr: 'काढणीला तयार' }, say: { en: 'Nearly harvest time!', mr: 'काढणी जवळ आली!' } },
];

export function stageOf(growth: number) {
  let i = 0;
  while (i + 1 < STAGES.length && growth >= STAGES[i + 1].at) i++;
  return i;
}

export function cropOfGame(s: GameState): Crop {
  return CROP_INDEX.get(s.cropId)!;
}

export function dayOf(s: GameState) {
  return Math.round((s.tick / TICKS) * cropOfGame(s).grow.days);
}

// ---------- collection ("Disease diary") ----------

const DIARY_KEY = 'diary';

export function loadDiary(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DIARY_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function addToDiary(id: string) {
  const d = new Set(loadDiary());
  d.add(id);
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify([...d]));
  } catch {
    /* ignore */
  }
}
