import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Ambient, Art, SANS, SeqOffset, easeIO, usePulse, tween} from '../theme';
import type {SongConfig} from '../types';

const Ic = ({d, s = 76}: {d: string; s?: number}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="#fff"><path d={d} /></svg>
);
const PREV = 'M6 6h2v12H6zM20 6v12L9.5 12z';
const NEXT = 'M16 6h2v12h-2zM4 6l10.5 6L4 18z';
const PAUSE = 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z';
const PLAY = 'M8 5v14l11-7z';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Escenas 5+6: tarjeta Apple Music (cristal) con órbita 3D, y cierre: cámara se aleja, destello y fundido.
export const Player: React.FC<{cfg: SongConfig; cover?: string; len: number; closeAt: number}> = ({cfg, cover, len, closeAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cfg.colors;
  const p = usePulse(cfg);
  const enter = spring({frame: f, fps, config: {damping: 18, stiffness: 90}});
  const cl = tween(f, closeAt, len, 0, 1, easeIO);
  const flash = tween(f, closeAt + 4, closeAt + 14, 0, 1) * (1 - tween(f, closeAt + 14, len - 4, 0, 1));
  const ry = (1 - enter) * 55 + Math.sin(f / 38) * 9 + cl * -40;
  const rx = (1 - enter) * -20 + Math.cos(f / 46) * 5 + cl * 14;
  const sc = (0.75 + enter * 0.25) * (1 - cl * 0.55) * (1 + p * 0.008);
  const pressed = tween(f, 26, 32, 1, 0.88, (x) => x) * 0 + (f > 30 && f < 38 ? 0.9 : 1);
  const off = React.useContext(SeqOffset);
  const total = cfg.songLength ?? 215;
  const secs = cfg.audioStart + (f + off) / fps;
  const prog = secs / total;
  const sheen = tween(f, 10, 60, -40, 140, easeIO);
  return (
    <AbsoluteFill>
      <Ambient colors={c} strength={1.15 - cl} />
      <AbsoluteFill style={{perspective: 1600, filter: `blur(${(1 - enter) * 18}px)`, opacity: 1 - tween(f, len - 14, len, 0, 1)}}>
        <div style={{position: 'absolute', left: 90, top: 300, width: 900, height: 1320, borderRadius: 78, transform: `rotateY(${ry}deg) rotateX(${rx}deg) scale(${sc})`, transformStyle: 'preserve-3d', background: 'linear-gradient(160deg, rgba(255,255,255,.22), rgba(255,255,255,.06))', backdropFilter: 'blur(60px) saturate(1.6)', border: '1.5px solid rgba(255,255,255,.28)', boxShadow: `0 80px 200px ${c.primary}88, 0 0 0 1px rgba(255,255,255,.05) inset, 0 -30px 80px rgba(255,255,255,.08) inset`, overflow: 'hidden', padding: 70, paddingTop: 70, boxSizing: 'border-box', fontFamily: SANS, color: '#fff'}}>
          <div style={{position: 'absolute', inset: 0, background: `linear-gradient(105deg, transparent ${sheen - 12}%, rgba(255,255,255,.28) ${sheen}%, transparent ${sheen + 12}%)`, mixBlendMode: 'overlay'}} />
          <div style={{width: 760, height: 760, borderRadius: 40, overflow: 'hidden', boxShadow: `0 40px 90px rgba(0,0,0,.55)`, transform: `translateZ(60px) scale(${1 + p * 0.01})`}}>
            <Art src={cover} colors={c} style={{width: '100%', height: '100%'}} />
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 52}}>
            <div style={{minWidth: 0}}>
              <div style={{fontSize: 58, fontWeight: 700, letterSpacing: -1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 650}}>{cfg.title}</div>
              <div style={{fontSize: 46, fontWeight: 500, color: 'rgba(255,255,255,.62)', marginTop: 4}}>{cfg.artist}</div>
            </div>
            <div style={{width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 800, letterSpacing: 2, paddingBottom: 14, boxSizing: 'border-box'}}>···</div>
          </div>
          <div style={{marginTop: 36}}>
            <div style={{height: 10, borderRadius: 5, background: 'rgba(255,255,255,.25)'}}>
              <div style={{width: `${prog * 100}%`, height: '100%', borderRadius: 5, background: '#fff', position: 'relative'}}>
                <div style={{position: 'absolute', right: -8, top: -4, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 0 20px #fff'}} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,.55)', marginTop: 16}}>
              <span>{fmt(secs)}</span><span>-{fmt(Math.max(0, total - secs))}</span>
            </div>
          </div>
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 110, marginTop: 14}}>
            <Ic d={PREV} />
            <div style={{transform: `scale(${pressed})`}}><Ic d={f < 30 ? PLAY : PAUSE} s={130} /></div>
            <Ic d={NEXT} />
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, ${c.accent}, transparent 60%)`, opacity: flash * 0.55, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};
