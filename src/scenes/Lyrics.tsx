import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SANS, SERIF, tween, usePulse, easeIO} from '../theme';
import type {SongConfig} from '../types';

type Tok = {w: string; kind: 'n' | 'hi' | 'it'};
const parse = (s: string): Tok[] =>
  s.split(/\s+/).filter(Boolean).map((w) => {
    if (/^\*.+\*[^\w]*$/.test(w)) return {w: w.replace(/\*/g, ''), kind: 'hi'};
    if (/^_.+_[^\w]*$/.test(w)) return {w: w.replace(/_/g, ''), kind: 'it'};
    return {w, kind: 'n'};
  });
const rows = (toks: Tok[], max = 11) => {
  const out: {t: Tok; i: number}[][] = [[]];
  let len = 0;
  toks.forEach((t, i) => {
    if (len + t.w.length > max && out[out.length - 1].length) { out.push([]); len = 0; }
    out[out.length - 1].push({t, i}); len += t.w.length + 1;
  });
  return out;
};

// Capa de letras continua (todo el video): cada línea permanece mientras se canta y cada palabra se ilumina
// en el instante en que suena (tiempos de la alineación automática). Sin letras usa título/artista.
export const Lyrics: React.FC<{cfg: SongConfig; introEnd: number}> = ({cfg, introEnd}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cfg.colors;
  const p = usePulse(cfg);
  const now = f / fps;
  type L = {at: number; end: number; text: string; ws?: number[]};
  const own: L[] = (cfg.lyrics ?? [])
    .map((l) => ({at: l.t - cfg.audioStart, end: (l.end ?? l.t + 3) - cfg.audioStart + 0.4, text: l.text, ws: l.ws?.map((x) => x - cfg.audioStart)}))
    .filter((l) => l.end > 0 && l.at < cfg.duration);
  const lines: L[] = own.length
    ? own.map((l, i) => {
        const nx = own[i + 1]?.at;
        // mantiene la línea en pantalla hasta la siguiente si el hueco es corto: nunca queda vacío mientras se canta
        return {...l, end: nx !== undefined && nx - l.end < 2.4 ? nx - 0.02 : Math.min(l.end, nx ?? l.end)};
      })
    : (() => {
        const tw = cfg.title.split(' '); const w = [`*${tw[0]}*`, ...tw.slice(1), ...cfg.artist.split(' ').map((x) => `_${x}_`)];
        const n = Math.ceil(w.length / 2), st = cfg.duration / n;
        return Array.from({length: n}, (_, i) => ({at: i * st, end: (i + 1) * st, text: w.slice(i * 2, i * 2 + 2).join(' ')}));
      })();
  const low = tween(f, introEnd - 14, introEnd + 10, 1, 0, easeIO); // durante la intro las letras van abajo y más pequeñas
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {lines.map((l, li) => {
        if (now < l.at - 0.2 || now > l.end + 0.35) return null;
        const lf = f - Math.round(l.at * fps);
        const toks = parse(l.text);
        const timed = l.ws && l.ws.length === toks.length ? l.ws : undefined;
        const rs = rows(toks);
        const longest = Math.max(...rs.map((r) => r.map((x) => x.t.w).join(' ').length), 4);
        const size = Math.min(210, 960 / (longest * 0.74));
        const enter = spring({frame: lf + 6, fps, config: {damping: 18, stiffness: 120}});
        const out = tween(now, l.end - 0.05, l.end + 0.35, 0, 1);
        return (
          <div key={li} style={{position: 'absolute', left: 60, right: 60, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `translateY(${330 + low * 270 + (1 - enter) * 50 - out * 40}px) scale(${(1 - low * 0.3) * (1 + p * 0.016)}) rotate(${(li % 2 ? 1.6 : -1.6)}deg)`, opacity: Math.min(1, enter) * (1 - out), filter: out * 12 + (1 - enter) * 10 > 0.3 ? `blur(${out * 12 + (1 - enter) * 10}px)` : undefined}}>
            {rs.map((r, ri) => (
              <div key={ri} style={{display: 'flex', gap: size * 0.22, lineHeight: 0.98}}>
                {r.map(({t, i}) => {
                  const wt = timed ? timed[i] : l.at + i * 0.18;
                  const on = spring({frame: f - Math.round(wt * fps), fps, config: {damping: 11, stiffness: 190}});
                  const sung = now >= wt - 0.02;
                  const pop = sung ? 1 + Math.max(0, 1 - (now - wt) * 4) * 0.1 * on : 1;
                  const base: React.CSSProperties = {fontSize: size, display: 'inline-block', transform: `scale(${pop}) translateY(${(1 - on) * 14}px)`, opacity: 0.38 + 0.62 * on, transformOrigin: '50% 80%', textShadow: `0 4px 20px rgba(0,0,0,.7)${sung && t.kind !== 'n' ? `, 0 0 28px ${c.accent}99` : ''}`};
                  if (t.kind === 'it') return <span key={i} style={{...base, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, color: c.accent, fontSize: size * 1.12, letterSpacing: -2}}>{t.w}</span>;
                  return <span key={i} style={{...base, fontFamily: SANS, fontWeight: 800, letterSpacing: -size * 0.04, textTransform: 'uppercase', color: t.kind === 'hi' ? c.accent : '#fff'}}>{t.w}</span>;
                })}
              </div>
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
