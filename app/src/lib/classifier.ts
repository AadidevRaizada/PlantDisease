import * as ort from 'onnxruntime-web';
import { CONDITION_INDEX, CROPS, OTHER_ID } from '../data/crops';

export interface Prediction {
  id: string;
  score: number;
}

export interface Match {
  id: string;
  img: string;
  similarity: number;
}

export interface Diagnosis {
  /** top conditions, best first */
  predictions: Prediction[];
  /** probability summed per crop (plus "other"), best first */
  crops: Prediction[];
  /** closest reference photos from the bundled database */
  matches: Match[];
}

export interface Classifier {
  demo: boolean;
  diagnose(img: HTMLCanvasElement): Promise<Diagnosis>;
}

interface Ref {
  id: string;
  img: string;
  emb: Float32Array;
}

const SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const base = import.meta.env.BASE_URL;

let cached: Promise<Classifier> | null = null;

export function loadClassifier(): Promise<Classifier> {
  cached ??= load();
  return cached;
}

async function load(): Promise<Classifier> {
  try {
    const labelsRes = await fetch(`${base}models/labels.json`);
    if (!labelsRes.ok) throw new Error('no labels');
    const labels: string[] = await labelsRes.json();
    const [session, refs] = await Promise.all([
      ort.InferenceSession.create(`${base}models/model.onnx`, { executionProviders: ['webgpu', 'wasm'] }),
      loadRefs(),
    ]);
    return {
      demo: false,
      async diagnose(canvas) {
        const input = new ort.Tensor('float32', toTensor(canvas), [1, 3, SIZE, SIZE]);
        const out = await session.run({ [session.inputNames[0]]: input });
        const probs = softmax(out.logits.data as Float32Array);
        const emb = out.embedding ? (out.embedding.data as Float32Array) : null;
        return summarise(probs, labels, emb ? nearest(emb, refs, 4) : []);
      },
    };
  } catch (err) {
    console.warn('Model not found, running in demo mode:', err);
    return demoClassifier();
  }
}

async function loadRefs(): Promise<Ref[]> {
  try {
    const res = await fetch(`${base}models/refs.json`);
    if (!res.ok) return [];
    const raw: { id: string; img: string; emb: string }[] = await res.json();
    return raw.map((r) => {
      const bytes = Uint8Array.from(atob(r.emb), (c) => c.charCodeAt(0));
      const emb = Float32Array.from(new Int8Array(bytes.buffer));
      return { id: r.id, img: `${base}${r.img}`, emb: normalise(emb) };
    });
  } catch {
    return [];
  }
}

function nearest(query: Float32Array, refs: Ref[], k: number): Match[] {
  const q = normalise(Float32Array.from(query));
  return refs
    .map((r) => {
      let dot = 0;
      for (let i = 0; i < q.length; i++) dot += q[i] * r.emb[i];
      return { id: r.id, img: r.img, similarity: dot };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

function summarise(probs: number[], labels: string[], matches: Match[]): Diagnosis {
  const byCrop = new Map<string, number>();
  labels.forEach((id, i) => {
    const crop = id === OTHER_ID ? OTHER_ID : id.split('___')[0];
    byCrop.set(crop, (byCrop.get(crop) ?? 0) + probs[i]);
  });
  return {
    predictions: topK(probs, labels, 3),
    crops: [...byCrop].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score),
    matches,
  };
}

// Random but plausible output so the whole UI works before a model is trained.
function demoClassifier(): Classifier {
  const ids = [...CONDITION_INDEX.keys()];
  return {
    demo: true,
    async diagnose() {
      await new Promise((r) => setTimeout(r, 700));
      const crop = CROPS[Math.floor(Math.random() * CROPS.length)];
      const scores = ids.map((id) => (id.startsWith(crop.id) ? Math.random() ** 2 * 4 : Math.random() * 0.05));
      const sum = scores.reduce((a, b) => a + b, 0);
      return summarise(scores.map((s) => s / sum), ids, []);
    },
  };
}

function normalise(v: Float32Array): Float32Array {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

function toTensor(src: HTMLCanvasElement): Float32Array {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;
  // centre-crop to square, same as training's eval transform
  const side = Math.min(src.width, src.height);
  ctx.drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const out = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (let ch = 0; ch < 3; ch++) {
      out[ch * SIZE * SIZE + i] = (data[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
    }
  }
  return out;
}

function softmax(x: ArrayLike<number>): number[] {
  const arr = Array.from(x);
  const max = Math.max(...arr);
  const exps = arr.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

function topK(scores: number[], labels: string[], k: number): Prediction[] {
  return scores
    .map((score, i) => ({ id: labels[i], score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
