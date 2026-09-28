// Tiny Web Audio synth: every sound in the app is generated here, no audio files.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
let rainNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let birdTimer: number | null = null;

function readMuted() {
  try {
    return localStorage.getItem('muted') === '1';
  } catch {
    return false;
  }
}

function audio(): { ac: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ac: ctx, out: master! };
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('muted', m ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
}

interface Note {
  freq: number;
  at?: number;
  dur?: number;
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
}

function play(notes: Note[]) {
  const a = audio();
  if (!a) return;
  const now = a.ac.currentTime;
  for (const n of notes) {
    const t0 = now + (n.at ?? 0);
    const dur = n.dur ?? 0.15;
    const osc = a.ac.createOscillator();
    const g = a.ac.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, t0);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(n.vol ?? 0.25, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}

// C major pentatonic, warm and folky
const P = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0];

export const sfx = {
  tap: () => play([{ freq: 660, dur: 0.06, type: 'triangle', vol: 0.12 }]),
  pop: () => play([{ freq: 300, slideTo: 900, dur: 0.12, type: 'sine', vol: 0.3 }]),
  sprout: () =>
    play([
      { freq: P[2], dur: 0.12, type: 'triangle' },
      { freq: P[4], at: 0.09, dur: 0.12, type: 'triangle' },
      { freq: P[7], at: 0.18, dur: 0.25, type: 'triangle' },
    ]),
  levelUp: () =>
    play([P[0], P[2], P[3], P[5], P[7]].map((f, i) => ({ freq: f, at: i * 0.08, dur: 0.22, type: 'triangle' as const }))),
  water: () =>
    play([0, 0.07, 0.15].map((at, i) => ({ freq: 900 - i * 150, slideTo: 400, at, dur: 0.1, type: 'sine' as const, vol: 0.18 }))),
  spray: () => noiseBurst(0.35, 3000),
  coin: () =>
    play([
      { freq: 988, dur: 0.08, type: 'square', vol: 0.08 },
      { freq: 1319, at: 0.07, dur: 0.2, type: 'square', vol: 0.08 },
    ]),
  sick: () =>
    play([
      { freq: 330, slideTo: 250, dur: 0.3, type: 'sawtooth', vol: 0.08 },
      { freq: 262, slideTo: 196, at: 0.25, dur: 0.45, type: 'sawtooth', vol: 0.08 },
    ]),
  bug: () => play([0, 0.05, 0.1, 0.15].map((at) => ({ freq: 1800, slideTo: 2200, at, dur: 0.04, type: 'square' as const, vol: 0.04 }))),
  harvest: () =>
    play(
      [P[0], P[2], P[4], P[5], P[4], P[5], P[7], P[9]].map((f, i) => ({
        freq: f,
        at: i * 0.12,
        dur: i === 7 ? 0.6 : 0.18,
        type: 'triangle' as const,
        vol: 0.22,
      })),
    ),
  fail: () => play([P[4], P[3], P[2], P[0]].map((f, i) => ({ freq: f / 2, at: i * 0.18, dur: 0.3, type: 'triangle' as const }))),
  chirp: () => {
    const base = 2200 + Math.random() * 1200;
    play([
      { freq: base, slideTo: base * 1.4, dur: 0.07, vol: 0.05 },
      { freq: base * 1.1, slideTo: base * 1.5, at: 0.1, dur: 0.07, vol: 0.05 },
    ]);
  },
};

function noiseBuffer(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noiseBurst(dur: number, cutoff: number) {
  const a = audio();
  if (!a) return;
  const src = a.ac.createBufferSource();
  src.buffer = noiseBuffer(a.ac, dur);
  const f = a.ac.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = cutoff;
  const g = a.ac.createGain();
  const t0 = a.ac.currentTime;
  g.gain.setValueAtTime(0.15, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(a.out);
  src.start();
}

/** Looping rain whose loudness follows `level` (0..3). */
export function setRain(level: number) {
  const a = audio();
  if (!a) return;
  if (!rainNode) {
    const src = a.ac.createBufferSource();
    src.buffer = noiseBuffer(a.ac, 2);
    src.loop = true;
    const f = a.ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    const gain = a.ac.createGain();
    gain.gain.value = 0;
    src.connect(f).connect(gain).connect(a.out);
    src.start();
    rainNode = { src, gain };
  }
  rainNode.gain.gain.setTargetAtTime(level * 0.05, a.ac.currentTime, 0.4);
}

/** Occasional bird chirps while the game is running. */
export function setBirds(on: boolean) {
  if (birdTimer) window.clearInterval(birdTimer);
  birdTimer = null;
  if (on) birdTimer = window.setInterval(() => Math.random() < 0.35 && sfx.chirp(), 1800);
}

export function stopAmbient() {
  setBirds(false);
  if (rainNode && ctx) rainNode.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
}
