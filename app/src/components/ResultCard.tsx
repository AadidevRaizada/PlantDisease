import { CONDITION_INDEX, UI, type Lang } from '../data/crops';
import type { Prediction } from '../lib/classifier';
import { speak, ttsSupported } from '../lib/tts';

const MIN_CONFIDENCE = 0.5;

interface Props {
  lang: Lang;
  image: string;
  predictions: Prediction[];
  demo: boolean;
  onReset(): void;
}

export function ResultCard({ lang, image, predictions, demo, onReset }: Props) {
  const top = predictions[0];
  const hit = CONDITION_INDEX.get(top.id);
  const sure = !!hit && top.score >= MIN_CONFIDENCE;

  function readAloud() {
    if (!hit || !sure) return speak(UI.lowConfidence[lang], lang);
    const { crop, condition } = hit;
    speak(
      [
        `${crop.name[lang]}: ${condition.name[lang]}.`,
        `${UI.symptoms[lang]}: ${condition.symptoms[lang]}`,
        `${UI.treatment[lang]}: ${condition.treatment[lang]}`,
      ].join(' '),
      lang,
    );
  }

  return (
    <div className="result">
      {demo && <p className="demo-banner">{UI.demo[lang]}</p>}
      <img className="shot" src={image} alt="" />
      {hit && sure ? (
        <div className={`verdict ${hit.condition.healthy ? 'ok' : 'bad'}`}>
          <span className="crop">{hit.crop.emoji} {hit.crop.name[lang]}</span>
          <h2>{hit.condition.healthy ? '✅' : '⚠️'} {hit.condition.name[lang]}</h2>
          <div className="meter" aria-label={UI.confidence[lang]}>
            <div style={{ width: `${Math.round(top.score * 100)}%` }} />
          </div>
          <small>{UI.confidence[lang]}: {Math.round(top.score * 100)}%</small>
          <h3>{UI.symptoms[lang]}</h3>
          <p>{hit.condition.symptoms[lang]}</p>
          <h3>{UI.treatment[lang]}</h3>
          <p>{hit.condition.treatment[lang]}</p>
        </div>
      ) : (
        <div className="verdict unsure"><p>{UI.lowConfidence[lang]}</p></div>
      )}

      {predictions.length > 1 && (
        <details>
          <summary>{UI.otherMatches[lang]}</summary>
          <ul>
            {predictions.slice(1).map((p) => {
              const h = CONDITION_INDEX.get(p.id);
              return (
                <li key={p.id}>
                  {h ? `${h.crop.name[lang]}: ${h.condition.name[lang]}` : p.id} ({Math.round(p.score * 100)}%)
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <div className="actions">
        {ttsSupported && <button className="primary" onClick={readAloud}>🔊 {UI.listen[lang]}</button>}
        <button className="secondary" onClick={onReset}>🔄 {UI.retake[lang]}</button>
      </div>
    </div>
  );
}
