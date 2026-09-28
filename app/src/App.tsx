import { lazy, Suspense, useEffect, useState } from 'react';
import { Diary } from './components/Diary';
import { Home } from './components/Home';
import { Scanner } from './components/Scanner';
import type { Lang } from './data/crops';
import { UI } from './data/ui';
import { Game } from './game/Game';
import { isMuted, setMuted, sfx } from './lib/sound';

type Route = 'home' | 'scan' | 'grow' | 'diary' | 'art';
const ROUTES: Route[] = ['home', 'scan', 'grow', 'diary', ...(import.meta.env.DEV ? (['art'] as const) : [])];
const ArtGallery = import.meta.env.DEV ? lazy(() => import('./components/art/ArtGallery')) : () => null;

function readRoute(): Route {
  const r = window.location.hash.replace('#/', '') as Route;
  return ROUTES.includes(r) ? r : 'home';
}

function savedLang(): Lang {
  try {
    return localStorage.getItem('lang') === 'mr' ? 'mr' : 'en';
  } catch {
    return 'en';
  }
}

export default function App() {
  const [lang, setLang] = useState<Lang>(savedLang);
  const [route, setRoute] = useState<Route>(readRoute);
  const [muted, setMutedState] = useState(isMuted);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('lang', lang);
    } catch {
      /* storage unavailable */
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const go = (r: string) => {
    window.location.hash = r === 'home' ? '' : `/${r}`;
    window.scrollTo(0, 0);
  };

  return (
    <div className={`app route-${route}`}>
      <header className="topbar">
        {route === 'home' ? (
          <div className="brand">
            <span className="logo">🌱</span>
            <div>
              <h1>{UI.title[lang]}</h1>
              <p>{UI.subtitle[lang]}</p>
            </div>
          </div>
        ) : (
          <button className="icon-btn back" onClick={() => { sfx.tap(); go('home'); }} aria-label={UI.back[lang]}>
            ← <span>{UI.home[lang]}</span>
          </button>
        )}
        <div className="top-actions">
          <button
            className="icon-btn"
            aria-label={UI.sound[lang]}
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
              if (muted) sfx.tap();
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="lang-toggle" role="group">
            <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'mr' ? 'active' : ''} onClick={() => setLang('mr')}>मराठी</button>
          </div>
        </div>
      </header>

      <main>
        {route === 'home' && <Home lang={lang} go={go} />}
        {route === 'scan' && <Scanner lang={lang} />}
        {route === 'grow' && <Game lang={lang} />}
        {route === 'diary' && <Diary lang={lang} />}
        {route === 'art' && <Suspense><ArtGallery /></Suspense>}
      </main>
    </div>
  );
}
