import { CROPS, type Lang } from '../data/crops';
import { UI } from '../data/ui';
import { sfx } from '../lib/sound';
import { speak } from '../lib/tts';
import { Farmer } from './art/Farmer';
import { Scene } from './art/Scene';

export function Home({ lang, go }: { lang: Lang; go(route: string): void }) {
  return (
    <div className="home">
      <Scene className="hero">
        <div className="hero-farmer">
          <Farmer size={96} mood="cheer" />
        </div>
        <button className="speech hero-speech" onClick={() => speak(UI.greeting[lang], lang)}>
          {UI.greeting[lang]} <span aria-hidden>🔊</span>
        </button>
      </Scene>

      <div className="mode-cards">
        <button className="mode-card scan" onClick={() => { sfx.pop(); go('scan'); }}>
          <span className="mode-icon">📷</span>
          <span className="mode-text">
            <b>{UI.scanTitle[lang]}</b>
            <small>{UI.scanDesc[lang]}</small>
          </span>
        </button>
        <button className="mode-card grow" onClick={() => { sfx.sprout(); go('grow'); }}>
          <span className="mode-icon">🌱</span>
          <span className="mode-text">
            <b>{UI.growTitle[lang]}</b>
            <small>{UI.growDesc[lang]}</small>
          </span>
        </button>
        <button className="mode-card diary" onClick={() => { sfx.tap(); go('diary'); }}>
          <span className="mode-icon">📔</span>
          <span className="mode-text">
            <b>{UI.diaryTitle[lang]}</b>
            <small>{UI.diaryDesc[lang]}</small>
          </span>
        </button>
      </div>

      <section className="crops">
        <h3>{UI.supported[lang]}</h3>
        <div className="chips">
          {CROPS.map((c) => (
            <span key={c.id} className="chip">{c.emoji} {c.name[lang]}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
