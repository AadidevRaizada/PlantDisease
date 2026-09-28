import type { Lang } from '../data/crops';

const LOCALE: Record<Lang, string> = { en: 'en-IN', mr: 'mr-IN' };

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  const prefix = LOCALE[lang].slice(0, 2);
  return (
    voices.find((v) => v.lang === LOCALE[lang]) ??
    voices.find((v) => v.lang.startsWith(prefix)) ??
    // Hindi voices read Devanagari reasonably when no Marathi voice is installed
    (lang === 'mr' ? voices.find((v) => v.lang.startsWith('hi')) : undefined)
  );
}

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string, lang: Lang) {
  if (!ttsSupported) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALE[lang];
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.rate = 0.95;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported) speechSynthesis.cancel();
}
