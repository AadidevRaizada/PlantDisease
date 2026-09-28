import { useEffect, useState } from 'react';
import type { Lang } from '../data/crops';
import { UI } from '../data/ui';
import { loadClassifier, type Classifier, type Diagnosis } from '../lib/classifier';
import { stopSpeaking } from '../lib/tts';
import { CameraCapture } from './CameraCapture';
import { ResultCard } from './ResultCard';

type State =
  | { step: 'capture' }
  | { step: 'analysing'; image: string }
  | { step: 'result'; image: string; diagnosis: Diagnosis };

export function Scanner({ lang }: { lang: Lang }) {
  const [state, setState] = useState<State>({ step: 'capture' });
  const [classifier, setClassifier] = useState<Classifier | null>(null);

  useEffect(() => {
    loadClassifier().then(setClassifier);
    return stopSpeaking;
  }, []);

  async function handleCapture(canvas: HTMLCanvasElement) {
    const image = canvas.toDataURL('image/jpeg', 0.85);
    setState({ step: 'analysing', image });
    const clf = classifier ?? (await loadClassifier());
    const diagnosis = await clf.diagnose(canvas);
    setState({ step: 'result', image, diagnosis });
  }

  if (state.step === 'capture') return <CameraCapture lang={lang} onCapture={handleCapture} />;
  if (state.step === 'analysing')
    return (
      <div className="analysing">
        <img className="shot" src={state.image} alt="" />
        <div className="leaf-spinner">🍃</div>
        <p>{UI.analysing[lang]}</p>
      </div>
    );
  return (
    <ResultCard
      lang={lang}
      image={state.image}
      diagnosis={state.diagnosis}
      demo={classifier?.demo ?? true}
      onReset={() => {
        stopSpeaking();
        setState({ step: 'capture' });
      }}
    />
  );
}
