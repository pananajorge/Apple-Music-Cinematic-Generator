import type {SongConfig} from './types';
export const FPS = 30;
// Fracciones del 30 s original; escalan a 15 s y se ajustan al pulso (bpm).
const CUTS = [0, 4, 8, 17, 22, 28, 30];
export const SCENES = ['intro', 'card', 'lyrics', 'artist', 'player', 'close'] as const;
export const buildTimeline = (duration: number, bpm?: number, beats?: number[]) => {
  const k = duration / 30;
  const beat = bpm ? 60 / bpm : 0;
  const cuts = CUTS.map((c, i) => {
    if (i === 0 || i === CUTS.length - 1) return c * k;
    const s = c * k;
    if (beats?.length) return beats.reduce((b, x) => (Math.abs(x - s) < Math.abs(b - s) ? x : b), beats[0]); // snap al beat detectado
    return beat ? Math.round(s / beat) * beat : s;
  });
  const f = cuts.map((s) => Math.round(s * FPS));
  return {intro: [f[0], f[1]], card: [f[1], f[2]], lyrics: [f[2], f[3]], artist: [f[3], f[4]], player: [f[4], f[6]], total: f[6]} as const;
};
