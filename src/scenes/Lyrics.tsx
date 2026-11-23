import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Ambient, SANS, SERIF, pulse, tween} from '../theme';
import type {SongConfig} from '../types';

type Tok = {w: string; kind: 'n' | 'hi' | 'it'};
const parse = (s: string): Tok[] =>
  s.split(/\s+/).filter(Boolean).map((w) => {
    if (/^\*.+\*[^\w]*$/.test(w)) return {w: w.replace(/\*/g, ''), kind: 'hi'};
    if (/^_.+_[^\w]*$/.test(w)) return {w: w.replace(/_/g, ''), kind: 'it'};
    return {w, kind: 'n'};
  });
const rows = (toks: Tok[], max = 11) => {
  const out: Tok[][] = [[]];
  let len = 0;
  toks.forEach((t) => {
    if (len + t.w.length > max && out[out.length - 1].length) { out.push([]); len = 0; }
    out[out.length - 1].push(t); len += t.w.length + 1;
  });
  return out;
};

// Escena 3: tipografía de videoclip. Solo muestra letras con marca de tiempo aportadas por el usuario;
// sin letras usa el título/artista (nunca inventa texto).
export const Lyrics: React.FC<{cfg: SongConfig; start: number; len: number}> = ({cfg, start, len}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cfg.colors;
  const p = pulse(f, fps, cfg.bpm);
  const t0 = start / fps;
  let lines: {at: number; end: number; text: string}[];
  const own = (cfg.lyrics ?? []).map((l) => ({at: l.t - cfg.audioStart - t0, text: l.text})).filter((l) => l.at >= -0.2 && l.at < len / fps - 0.4);
  if (own.length) {
    lines = own.map((l, i) => ({...l, end: Math.min(own[i + 1]?.at ?? len / fps, l.at + 3.2)}));
  } else {
    const tw = cfg.title.split(' ');
    const words = [`*${tw[0]}*`, ...tw.slice(1), ...cfg.artist.split(' ').map((w) => `_${w}_`)];
    const step = len / fps / Math.ceil(words.length / 2);
    lines = Array.from({length: Math.ceil(words.length / 2)}, (_, i) => ({at: i * step, end: (i + 1) * step, text: words.slice(i * 2, i * 2 + 2).join(' ')}));
  }
  const bg = tween(f, 0, 12, 0, 1);
  const cur = lines.find((l) => f / fps >= l.at && f / fps < l.end);
  return (
    <AbsoluteFill>
      <Ambient colors={c} strength={0.55 + p * 0.25} />
      <AbsoluteFill style={{opacity: bg}}>
        {lines.map((l, li) => {
          const lf = f - Math.round(l.at * fps);
          const lend = Math.round((l.end - l.at) * fps);
          if (lf < 0 || lf > lend + 6) return null;
          const rs = rows(parse(l.text));
          const longest = Math.max(...rs.map((r) => r.map((t) => t.w).join(' ').length), 4);
          const size = Math.min(230, 960 / (longest * 0.74));
          const out = tween(lf, lend - 4, lend + 6, 0, 1);
          let wi = 0;
          return (
            <div key={li} style={{position: 'absolute', left: 60, right: 60, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `scale(${1 + p * 0.018 + lf * 0.0004}) rotate(${-2 + li % 2 * 4}deg)`, opacity: 1 - out, filter: `blur(${out * 14}px)`}}>
              {rs.map((r, ri) => (
                <div key={ri} style={{display: 'flex', gap: size * 0.22, lineHeight: 0.98}}>
                  {r.map((t, ti) => {
                    const i = wi++;
                    const s = spring({frame: lf - i * 3, fps, config: {damping: 16, stiffness: 140}});
                    const common: React.CSSProperties = {fontSize: size, transform: `translateY(${(1 - s) * 90}px) scale(${0.9 + s * 0.1})`, opacity: s, filter: `blur(${(1 - s) * 12}px)`, display: 'inline-block'};
                    if (t.kind === 'it') return <span key={ti} style={{...common, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, color: '#ff4f9a', fontSize: size * 1.12, textTransform: 'none', letterSpacing: -2, textShadow: '0 0 50px #ff4f9a88'}}>{t.w}</span>;
                    return <span key={ti} style={{...common, fontFamily: SANS, fontWeight: 800, letterSpacing: -size * 0.04, textTransform: 'uppercase', color: t.kind === 'hi' ? '#ff4f9a' : '#fff', textShadow: t.kind === 'hi' ? '0 0 60px #ff4f9a88' : 'none'}}>{t.w}</span>;
                  })}
                </div>
              ))}
            </div>
          );
        })}
        {!cur && null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
