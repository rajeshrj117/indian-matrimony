import { NAKSHATRAS } from '@/lib/communities';
import type { Profile } from '@/lib/types';

export type HoroscopeMatch = {
  overall: number | null;          // 0-100, null when there is nothing to compare
  star: number | null;             // nakshatra signal, 0-100
  rashi: boolean | null;           // same moon sign?
  manglik: boolean | null;         // same manglik status?
};

const idx = (s?: string) => (s ? (NAKSHATRAS as readonly string[]).indexOf(s) : -1);
const known = (m?: string) => !!m && m !== "Don't know";

// Basic horoscope compatibility signal from the public fields (star, rashi, manglik).
// Shared by the discover card and the full /horoscope/[id] page so both show the same number.
export function horoscopeMatch(me?: Profile | null, other?: Profile | null): HoroscopeMatch {
  const none: HoroscopeMatch = { overall: null, star: null, rashi: null, manglik: null };
  if (!me || !other) return none;

  const a = idx(me.star);
  const b = idx(other.star);
  const star = a >= 0 && b >= 0 ? Math.round((1 - Math.abs(a - b) / NAKSHATRAS.length) * 100) : null;
  const rashi = me.rashi && other.rashi ? me.rashi === other.rashi : null;
  const manglik = known(me.manglik) && known(other.manglik) ? me.manglik === other.manglik : null;

  const parts = [star, rashi === null ? null : rashi ? 100 : 40, manglik === null ? null : manglik ? 100 : 45]
    .filter((x): x is number => typeof x === 'number');
  const overall = parts.length ? Math.round(parts.reduce((s, x) => s + x, 0) / parts.length) : null;
  return { overall, star, rashi, manglik };
}

// "Rohini · Vrishabha (Taurus)" — the horoscope name shown on the card.
export function horoscopeName(p: Profile): string {
  return [p.star, p.rashi].filter(Boolean).join(' · ');
}
