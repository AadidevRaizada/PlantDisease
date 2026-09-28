import { useEffect, useState } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { ResultCard } from './components/ResultCard';
import { CROPS, UI, type Lang } from './data/crops';
import { loadClassifier, type Classifier, type Prediction } from './lib/classifier';
import { stopSpeaking } from './lib/tts';

type State =
  | { step: 'capture' }
  | { step: 'analysing'; image: string }
  | { step: 'result'; image: string; predictions: Prediction[] };

function savedLang(): Lang {
  try {
    return localStorage.getItem('lang') === 'mr' ? 'mr' : 'en';
  } catch {
    return 'en';
  }
}

export default function App() {
  const [lang, setLang] = useState<Lang>(savedLang);
  const [state, setState] = useState<State>({ step: 'capture' });
  const [classifier, setClassifier] = useState<Classifier | null>(null);

  useEffect(() => {
    loadClassifier().then(setClassifier);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
    } catch {
      /* storage unavailable */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  async function handleCapture(canvas: HTMLCanvasElement) {
    const image = canvas.toDataURL('image/jpeg', 0.85);
    setState({ step: 'analysing', image });
    const clf = classifier ?? (await loadClassifier());
    const predictions = await clf.predict(canvas);
    setState({ step: 'result', image, predictions });
  }

  function reset() {
    stopSpeaking();
    setState({ step: 'capture' });
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>🌱 {UI.title[lang]}</h1>
          <p>{UI.subtitle[lang]}</p>
        </div>
        <div className="lang-toggle" role="group">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'mr' ? 'active' : ''} onClick={() => setLang('mr')}>मराठी</button>
        </div>
      </header>

      <main>
        {state.step === 'capture' && (
          <>
            <CameraCapture lang={lang} onCapture={handleCapture} />
            <section className="crops">
              <h3>{UI.supported[lang]}</h3>
              <div className="chips">
                {CROPS.map((c) => (
                  <span key={c.id} className="chip">{c.emoji} {c.name[lang]}</span>
                ))}
              </div>
            </section>
          </>
        )}
        {state.step === 'analysing' && (
          <div className="analysing">
            <img className="shot" src={state.image} alt="" />
            <div className="spinner" />
            <p>{UI.analysing[lang]}</p>
          </div>
        )}
        {state.step === 'result' && (
          <ResultCard
            lang={lang}
            image={state.image}
            predictions={state.predictions}
            demo={classifier?.demo ?? true}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}
