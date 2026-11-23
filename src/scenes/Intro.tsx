import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Ambient, SANS, easeIO, usePulse, tween} from '../theme';
import type {SongConfig} from '../types';

// Escenas 1+2: cuadrado luminoso -> tarjeta 3D flotante -> vuela hacia cámara.
export const Intro: React.FC<{cfg: SongConfig; a: number; total: number; photo?: string}> = ({cfg, a, total, photo}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cfg.colors;
  const p = usePulse(cfg);
  const appear = tween(f, 0, a * 0.55, 0, 1);
  const morph = tween(f, a * 0.78, a * 1.25, 0, 1, easeIO); // cuadrado -> tarjeta
  const fly = tween(f, total - 20, total, 0, 1, easeIO); // la tarjeta atraviesa la cámara
  const w = 460 + morph * 470;
  const h = 460 + morph * 80;
  const rx = 62 - morph * 50 + Math.sin(f / 40) * 5; // suelo -> frontal
  const ry = (1 - morph) * -24 + Math.sin(f / 26) * 16 * morph;
  const rz = (1 - morph) * 8 - morph * 2;
  const camZ = tween(f, 0, total, -300, 160, (x) => x);
  const angle = 135 + f * 2.4;
  const grad = `linear-gradient(${angle}deg, ${c.accent}, ${c.primary} 45%, ${c.secondary} 85%)`;
  const scale = (0.35 + appear * 0.65) * (1 + fly * 1.6) * (1 + p * 0.015);
  return (
    <AbsoluteFill>
      <Ambient colors={c} strength={appear} />
      <AbsoluteFill style={{perspective: 1500, perspectiveOrigin: '50% 45%', opacity: 1 - fly}}>
        {/* halo de luz */}
        <div style={{position: 'absolute', left: 540 - 700, top: 960 - 700, width: 1400, height: 1400, borderRadius: '50%', background: `radial-gradient(circle, ${c.accent}aa, ${c.primary}44 40%, transparent 70%)`, opacity: appear * (0.7 + p * 0.25), transform: `scale(${0.6 + appear * 0.5 + morph * 0.2})`, filter: 'blur(30px)'}} />
        <div style={{position: 'absolute', left: 540 - w / 2, top: 960 - h / 2, width: w, height: h, transformStyle: 'preserve-3d', transform: `translateZ(${camZ}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${scale})`, opacity: appear}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 40 + morph * 60, background: grad, boxShadow: `0 0 160px ${c.accent}cc, 0 60px 180px ${c.primary}99, inset 0 0 90px rgba(255,255,255,.35)`, overflow: 'hidden'}}>
            <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${30 + Math.sin(f / 30) * 25}% ${25 + Math.cos(f / 24) * 20}%, rgba(255,255,255,.75), transparent 45%)`, mixBlendMode: 'soft-light'}} />
            <div style={{position: 'absolute', left: 56, top: 48, fontFamily: SANS, fontWeight: 600, fontSize: 40, color: 'rgba(255,255,255,.85)', opacity: morph}}>{cfg.album ?? 'Now Playing'}</div>
            <div style={{position: 'absolute', left: 56, bottom: 44, right: photo ? 400 : 56, fontFamily: SANS, fontWeight: 800, fontSize: photo ? 128 : Math.min(150, 1500 / Math.max(cfg.title.length, 8)), letterSpacing: -4, lineHeight: 0.95, color: '#fff', opacity: morph, transform: `translateY(${(1 - morph) * 60}px)`, textShadow: '0 4px 40px rgba(0,0,0,.25)'}}>{cfg.title}</div>
          </div>
          {photo && (
            <div style={{position: 'absolute', inset: 0, clipPath: `inset(-1100px -300px 0px -300px round 0 0 ${40 + morph * 60}px ${40 + morph * 60}px)`, pointerEvents: 'none'}}>
              <img src={photo} style={{position: 'absolute', right: 18, bottom: 0, height: 1010, transform: `translateZ(90px) translateY(${(1 - tween(f, a * 0.95, a * 1.45, 0, 1)) * 240}px) scale(${0.92 + tween(f, a * 0.95, a * 1.45, 0, 0.08)})`, transformOrigin: '50% 100%', opacity: tween(f, a * 0.95, a * 1.3, 0, 1)}} />
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
