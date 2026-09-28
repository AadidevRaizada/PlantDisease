import * as ort from 'onnxruntime-web';
import { CONDITION_INDEX } from '../data/crops';

export interface Prediction {
  id: string;
  score: number;
}

export interface Classifier {
  demo: boolean;
  predict(img: HTMLCanvasElement): Promise<Prediction[]>;
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
    const session = await ort.InferenceSession.create(`${base}models/model.onnx`, {
      executionProviders: ['webgpu', 'wasm'],
    });
    return {
      demo: false,
      async predict(canvas) {
        const input = new ort.Tensor('float32', toTensor(canvas), [1, 3, SIZE, SIZE]);
        const out = await session.run({ [session.inputNames[0]]: input });
        const logits = out[session.outputNames[0]].data as Float32Array;
        return topK(softmax(logits), labels, 3);
      },
    };
  } catch (err) {
    console.warn('Model not found, running in demo mode:', err);
    return demoClassifier();
  }
}

// Random but plausible predictions so the whole UI flow works before a model is trained.
function demoClassifier(): Classifier {
  const ids = [...CONDITION_INDEX.keys()];
  return {
    demo: true,
    async predict() {
      await new Promise((r) => setTimeout(r, 600));
      const scores = ids.map(() => Math.random() ** 4);
      const sum = scores.reduce((a, b) => a + b, 0);
      return topK(scores.map((s) => s / sum), ids, 3);
    },
  };
}

function toTensor(src: HTMLCanvasElement): Float32Array {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;
  // centre-crop to square
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
