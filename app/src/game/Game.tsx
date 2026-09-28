import { useEffect, useMemo, useRef, useState } from 'react';
import { Farmer } from '../components/art/Farmer';
import { Plant } from '../components/art/Plant';
import { Scene } from '../components/art/Scene';
import { CROPS, CROP_INDEX, type Lang, type SeasonId } from '../data/crops';
import { UI } from '../data/ui';
import { setBirds, setRain, sfx, stopAmbient } from '../lib/sound';
import { speak, stopSpeaking } from '../lib/tts';
import {
  ACTIONS,
  SEASONS,
  STAGES,
  TICKS,
  act,
  addToDiary,
  dayOf,
  newGame,
  riskOf,
  stageOf,
  step,
  whyText,
  type ActionId,
  type GameState,
} from './sim';

const SPEEDS = [0, 1100, 500];

export function Game({ lang }: { lang: Lang }) {
  const [setup, setSetup] = useState<{ crop: string; season: SeasonId } | null>(null);
  if (!setup) return <Setup lang={lang} onStart={(crop, season) => setSetup({ crop, season })} />;
  return <Play key={`${setup.crop}-${setup.season}`} lang={lang} cropId={setup.crop} season={setup.season} onExit={() => setSetup(null)} />;
}

function Setup({ lang, onStart }: { lang: Lang; onStart(crop: string, season: SeasonId): void }) {
  const [crop, setCrop] = useState(CROPS[0].id);
  const [season, setSeason] = useState<SeasonId>(CROPS[0].grow.season);
  return (
    <div className="setup">
      <div className="bubble-row">
        <Farmer size={70} mood="cheer" />
        <p className="bubble">{UI.gameIntro[lang]}</p>
      </div>
      <h2>{UI.pickCrop[lang]}</h2>
      <div className="crop-grid">
        {CROPS.map((c) => (
          <button
            key={c.id}
            className={`crop-card ${crop === c.id ? 'selected' : ''}`}
            onClick={() => {
              sfx.tap();
              setCrop(c.id);
              setSeason(c.grow.season);
            }}
          >
            <span className="big-emoji">{c.emoji}</span>
            <span>{c.name[lang]}</span>
            <small>{c.grow.days} {UI.days[lang]}</small>
          </button>
        ))}
      </div>
      <h2>{UI.pickSeason[lang]}</h2>
      <div className="season-row">
        {(Object.keys(SEASONS) as SeasonId[]).map((id) => (
          <button key={id} className={`pill ${season === id ? 'selected' : ''}`} onClick={() => { sfx.tap(); setSeason(id); }}>
            {SEASONS[id].emoji} {SEASONS[id].name[lang]}
          </button>
        ))}
      </div>
      <p className="hint">{UI.seasonHint[lang]}</p>
      <button className="primary big wide" onClick={() => { sfx.sprout(); onStart(crop, season); }}>
        🌱 {UI.plantSeed[lang]}
      </button>
    </div>
  );
}

function Play({ lang, cropId, season, onExit }: { lang: Lang; cropId: string; season: SeasonId; onExit(): void }) {
  const crop = CROP_INDEX.get(cropId)!;
  const [state, setState] = useState<GameState>(() => newGame(cropId, season));
  const [speed, setSpeed] = useState(1);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const seen = useRef(0);

  // game loop
  useEffect(() => {
    if (!SPEEDS[speed] || state.result) return;
    const id = window.setInterval(() => setState((s) => step(s)), SPEEDS[speed]);
    return () => window.clearInterval(id);
  }, [speed, state.result]);

  // ambient sound
  useEffect(() => {
    setRain(speed && !state.result ? state.weather.rain : 0);
  }, [state.weather.rain, speed, state.result]);
  useEffect(() => {
    setBirds(!!speed && !state.result && state.weather.rain < 1);
  }, [speed, state.result, state.weather.rain]);
  useEffect(() => () => { stopAmbient(); stopSpeaking(); }, []);

  // react to new events
  useEffect(() => {
    const fresh = state.events.filter((e) => e.tick > seen.current);
    if (!fresh.length) return;
    seen.current = state.tick;
    for (const e of fresh) {
      if (e.kind === 'onset') {
        sfx.sick();
        if (e.conditionId) addToDiary(e.conditionId);
      } else if (e.kind === 'stage') sfx.sprout();
      else if (e.kind === 'bugs') sfx.bug();
    }
  }, [state.events, state.tick]);

  useEffect(() => {
    if (state.result?.outcome === 'harvest') sfx.harvest();
    if (state.result?.outcome === 'lost') sfx.fail();
  }, [state.result]);

  const worst = useMemo(() => {
    let best: { id: string; severity: number } | null = null;
    for (const [id, d] of Object.entries(state.diseases)) if (d.severity > (best?.severity ?? 0)) best = { id, severity: d.severity };
    return best;
  }, [state.diseases]);
  const worstCond = worst ? crop.conditions.find((c) => c.id === worst.id) : undefined;
  const bugs = Math.max(...crop.conditions.map((c) => (c.sim?.vector ? state.vectors[c.sim.vector] : 0)), 0);
  const thirst = Math.max(0, Math.min(1, (0.3 - state.moisture) / 0.3));
  const last = state.events[state.events.length - 1];
  const mood = state.result?.outcome === 'harvest' ? 'cheer' : (worst?.severity ?? 0) > 0.25 || thirst > 0.5 ? 'worried' : 'happy';
  const stage = STAGES[stageOf(state.growth)];

  function doAction(a: ActionId) {
    if (state.coins < ACTIONS[a].cost) return;
    ({ water: sfx.water, drain: sfx.water, fungicide: sfx.spray, copper: sfx.spray, neem: sfx.spray, prune: sfx.pop } as const)[a]();
    if (ACTIONS[a].cost) sfx.coin();
    setState((s) => act(s, a));
  }

  function setTarget(patch: Partial<GameState['target']>) {
    setState((s) => ({ ...s, target: { ...s.target, ...patch } }));
  }

  return (
    <div className="play">
      <div className="hud">
        <button className="icon-btn" onClick={() => { stopAmbient(); onExit(); }} aria-label={UI.back[lang]}>←</button>
        <span className="hud-crop">{crop.emoji} {crop.name[lang]}</span>
        <span className="hud-chip">📅 {UI.day[lang]} {dayOf(state)}/{crop.grow.days}</span>
        <span className="hud-chip">🪙 {state.coins}</span>
        <div className="speed">
          {['⏸', '▶', '⏩'].map((ic, i) => (
            <button key={i} className={speed === i ? 'on' : ''} onClick={() => { sfx.tap(); setSpeed(i); }} aria-label={ic}>{ic}</button>
          ))}
        </div>
      </div>

      <Scene
        className="game-scene"
        rain={state.weather.rain}
        heat={Math.max(0, Math.min(1, (state.weather.temp - 12) / 28))}
        haze={Math.max(0, (state.weather.hum - 70) / 30)}
      >
        <div className="plant-slot">
          <Plant
            crop={cropId}
            growth={state.growth}
            thirst={thirst}
            bugs={bugs}
            disease={worstCond?.sim && worst ? { sim: worstCond.sim, severity: worst.severity } : undefined}
          />
        </div>
        <div className="farmer-slot">
          <Farmer size={64} mood={mood} />
        </div>
        {last && (
          <button className={`speech ${last.kind}`} onClick={() => speak(last.text[lang], lang)}>
            {last.text[lang]} <span aria-hidden>🔊</span>
          </button>
        )}
        <div className="weather-badge">
          🌡️ {Math.round(state.weather.temp)}°C · 💦 {Math.round(state.weather.hum)}% {state.weather.rain >= 0.5 ? '· 🌧️' : ''}
        </div>
      </Scene>

      <div className="bars">
        <Meter label={`${UI.growth[lang]} · ${stage.name[lang]}`} value={state.growth} tone="leaf" />
        <Meter label={UI.health[lang]} value={state.health} tone={state.health > 0.6 ? 'leaf' : state.health > 0.3 ? 'sun' : 'danger'} />
        <Meter label={UI.soil[lang]} value={Math.min(1, state.moisture / 1.1)} tone={state.moisture > 1.05 && cropId !== 'rice' ? 'danger' : thirst > 0.3 ? 'sun' : 'water'} />
      </div>

      <section className="panel">
        <h3>🧑‍🌾 {UI.actions[lang]}</h3>
        <div className="action-grid">
          {(Object.keys(ACTIONS) as ActionId[]).map((a) => {
            const info = ACTIONS[a];
            const active = a in state.protect;
            return (
              <button key={a} className={`action ${active ? 'active' : ''}`} disabled={state.coins < info.cost || !!state.result} onClick={() => doAction(a)} title={info.tip[lang]}>
                <span className="big-emoji">{info.emoji}</span>
                <span>{info.name[lang]}</span>
                <small>{info.cost ? `🪙 ${info.cost}` : UI.free[lang]}{active ? ' ✓' : ''}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h3>🌦️ {UI.weather[lang]}</h3>
        <Slider label={`🌡️ ${UI.temperature[lang]}`} value={state.target.temp} min={8} max={44} unit="°C" onChange={(temp) => setTarget({ temp })} />
        <Slider label={`💦 ${UI.humidity[lang]}`} value={state.target.hum} min={15} max={100} unit="%" onChange={(hum) => setTarget({ hum })} />
        <Segmented label={`🌧️ ${UI.rain[lang]}`} value={Math.round(state.target.rain)} options={UI.rainLevels[lang].split('|')} onChange={(rain) => setTarget({ rain })} />
        <Segmented label={`🧺 ${UI.fertiliser[lang]}`} value={state.nitrogen} options={UI.nLevels[lang].split('|')} onChange={(nitrogen) => setState((s) => ({ ...s, nitrogen }))} />
      </section>

      <section className="panel">
        <h3>🔬 {UI.diseaseRisk[lang]}</h3>
        <p className="hint">{UI.riskHint[lang]}</p>
        <ul className="risk-list">
          {crop.conditions.filter((c) => c.sim).map((c) => {
            const d = state.diseases[c.id];
            const risk = riskOf(c, state);
            const active = d.severity > 0;
            return (
              <li key={c.id} className={active ? 'active' : ''}>
                <button className="risk-row" onClick={() => setOpenInfo(openInfo === c.id ? null : c.id)}>
                  <span className="risk-name">{active ? '⚠️' : '•'} {c.name[lang]}</span>
                  <span className="risk-bar"><span style={{ width: `${(active ? d.severity : d.pressure) * 100}%` }} className={active ? 'sev' : 'pressure'} /></span>
                  <span className={`risk-today r${Math.min(2, Math.floor(risk * 3))}`}>{UI.riskLevels[lang].split('|')[Math.min(2, Math.floor(risk * 3))]}</span>
                </button>
                {openInfo === c.id && (
                  <div className="risk-info">
                    <p>{whyText(c, lang)}</p>
                    <p><b>{UI.treatment[lang]}:</b> {c.treatment[lang]}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {state.result && (
        <div className="modal-backdrop">
          <div className="modal">
            <Farmer size={70} mood={state.result.outcome === 'harvest' ? 'cheer' : 'worried'} />
            <h2>{state.result.outcome === 'harvest' ? UI.harvestTitle[lang] : UI.lostTitle[lang]}</h2>
            {state.result.outcome === 'harvest' && (
              <>
                <div className="stars">{'★'.repeat(state.result.stars)}<span>{'★'.repeat(3 - state.result.stars)}</span></div>
                <p>{UI.yieldLabel[lang]}: <b>{state.result.yieldPct}%</b></p>
              </>
            )}
            <p>{UI.metDiseases[lang]}: {Object.entries(state.diseases).filter(([, d]) => d.severity > 0).map(([id]) => crop.conditions.find((c) => c.id === id)!.name[lang]).join(', ') || UI.none[lang]}</p>
            <p className="hint">{UI.lessonTip[lang]}</p>
            <div className="actions">
              <button className="primary" onClick={() => { seen.current = 0; setState(newGame(cropId, season)); setSpeed(1); }}>🔁 {UI.playAgain[lang]}</button>
              <button className="secondary" onClick={onExit}>🌾 {UI.otherCrop[lang]}</button>
            </div>
          </div>
        </div>
      )}
      <p className="tick-note">{Math.round((state.tick / TICKS) * 100)}%</p>
    </div>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: 'leaf' | 'sun' | 'danger' | 'water' }) {
  return (
    <div className="meter-row">
      <span>{label}</span>
      <div className={`meter ${tone}`}><div style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  );
}

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange(v: number): void }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} />
      <b>{value}{unit}</b>
    </label>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: number; options: string[]; onChange(v: number): void }) {
  return (
    <div className="segmented-row">
      <span>{label}</span>
      <div className="segmented">
        {options.map((o, i) => (
          <button key={o} className={value === i ? 'on' : ''} onClick={() => { sfx.tap(); onChange(i); }}>{o}</button>
        ))}
      </div>
    </div>
  );
}
