import { useState } from 'react';
import { CROPS, type Lang } from '../data/crops';
import { UI } from '../data/ui';
import { loadDiary, whyText } from '../game/sim';
import { speak } from '../lib/tts';

export function Diary({ lang }: { lang: Lang }) {
  const [found] = useState(() => new Set(loadDiary()));
  const [open, setOpen] = useState<string | null>(null);
  const total = CROPS.reduce((n, c) => n + c.conditions.filter((d) => d.sim).length, 0);
  return (
    <div className="diary">
      <h2>📔 {UI.diaryTitle[lang]}</h2>
      <p className="hint">{UI.diaryIntro[lang]} ({found.size}/{total} {UI.found[lang]})</p>
      {CROPS.map((crop) => (
        <section key={crop.id} className="panel">
          <h3>{crop.emoji} {crop.name[lang]}</h3>
          <div className="diary-grid">
            {crop.conditions.filter((c) => c.sim).map((c) => {
              const known = found.has(c.id);
              return (
                <button
                  key={c.id}
                  className={`diary-card ${known ? 'known' : 'locked'}`}
                  onClick={() => known && setOpen(open === c.id ? null : c.id)}
                >
                  <span className="swatch" style={{ background: known ? c.sim!.color : undefined }}>{known ? '' : '?'}</span>
                  <span>{known ? c.name[lang] : UI.locked[lang]}</span>
                </button>
              );
            })}
          </div>
          {crop.conditions.filter((c) => c.id === open).map((c) => (
            <div key={c.id} className="risk-info">
              <p><b>{c.name[lang]}</b>: {c.symptoms[lang]}</p>
              <p>{whyText(c, lang)}</p>
              <p><b>{UI.treatment[lang]}:</b> {c.treatment[lang]}</p>
              <button className="secondary small" onClick={() => speak(`${c.name[lang]}. ${c.symptoms[lang]} ${whyText(c, lang)} ${c.treatment[lang]}`, lang)}>🔊 {UI.listen[lang]}</button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
