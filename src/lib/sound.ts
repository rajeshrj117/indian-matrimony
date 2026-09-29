'use client';

// Tiny synthesized sound-effect kit for the chat UI. Everything is generated on the fly
// with the Web Audio API — no mp3/wav assets to ship, and it just works offline. All
// calls are safe no-ops on the server or before any user gesture has unlocked audio.

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

const SOUND_PREF_KEY = 'flirty:chatSoundOn';

export const getSoundPref = (): boolean => {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(SOUND_PREF_KEY);
  return v === null ? true : v === '1';
};

export const setSoundPref = (on: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_PREF_KEY, on ? '1' : '0');
};

type Tone = { freq: number; start: number; dur: number; type?: OscillatorType; gain?: number };

const playTones = (tones: Tone[]) => {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  for (const t of tones) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = t.type ?? 'sine';
    osc.frequency.value = t.freq;
    const peak = t.gain ?? 0.08;
    const startAt = now + t.start;
    const endAt = startAt + t.dur;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + Math.min(0.02, t.dur / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }
};

/** Soft upward "whoosh" blip — outgoing message. */
export const playSend = () => {
  if (!getSoundPref()) return;
  playTones([{ freq: 640, start: 0, dur: 0.07, gain: 0.06 }, { freq: 900, start: 0.05, dur: 0.09, gain: 0.06 }]);
};

/** Gentle two-note pop — incoming message. */
export const playReceive = () => {
  if (!getSoundPref()) return;
  playTones([{ freq: 520, start: 0, dur: 0.08, gain: 0.055 }, { freq: 780, start: 0.07, dur: 0.11, gain: 0.06 }]);
};

/** Bright little chime — reaction / heart tap. */
export const playHeart = () => {
  if (!getSoundPref()) return;
  playTones([
    { freq: 880, start: 0, dur: 0.09, gain: 0.05 },
    { freq: 1175, start: 0.05, dur: 0.09, gain: 0.05 },
    { freq: 1568, start: 0.1, dur: 0.14, gain: 0.045 },
  ]);
};

/** Playful pop for lightweight UI taps (chips, buttons). */
export const playTap = () => {
  if (!getSoundPref()) return;
  playTones([{ freq: 500, start: 0, dur: 0.045, gain: 0.045 }]);
};

/** Bigger celebratory sparkle — sending a gift. */
export const playGift = () => {
  if (!getSoundPref()) return;
  playTones([
    { freq: 660, start: 0, dur: 0.08, gain: 0.05 },
    { freq: 880, start: 0.06, dur: 0.08, gain: 0.05 },
    { freq: 1100, start: 0.12, dur: 0.08, gain: 0.05 },
    { freq: 1400, start: 0.18, dur: 0.16, gain: 0.05 },
  ]);
};
