import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Ambient, Art, SANS, usePulse, tween} from '../theme';
import type {SongConfig} from '../types';

// Escena 4: foto (idealmente PNG recortado) con nombre gigante detrás, zoom lento y paralaje.
export const Artist: React.FC<{cfg: SongConfig; photo?: string; cover?: string; len: number}> = ({cfg, photo, cover, len}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cfg.colors;
  const p = usePulse(cfg);
  const inn = tween(f, 0, 18, 0, 1);
  const zoom = tween(f, 0, len, 1.28, 1.02, (x) => x);
  
  const name = cfg.artist.toUpperCase();
  const words = name.split(' ');
  return (
    <AbsoluteFill>
      <Ambient colors={c} strength={0.9} />
      <AbsoluteFill style={{filter: inn < 1 ? `blur(${(1 - inn) * 20}px)` : undefined, perspective: 1600}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `translateY(${tween(f, 0, len, 40, -50, (x) => x)}px)`}}>
          {words.map((w, i) => (
            <div key={i} style={{fontFamily: SANS, fontWeight: 800, fontSize: Math.min(300, 1000 / Math.max(w.length * 0.6, 3)), lineHeight: 0.92, letterSpacing: -10, color: 'transparent', WebkitTextStroke: `3px ${i % 2 ? c.accent : 'rgba(255,255,255,.55)'}`, opacity: 0.9}}>{w}</div>
          ))}
        </div>
        {photo ? (
          <img src={photo} style={{position: 'absolute', left: 90, bottom: 160, width: 900, height: 1250, objectFit: photo.endsWith('.png') ? 'contain' : 'cover', objectPosition: 'center bottom', borderRadius: photo.endsWith('.png') ? 0 : 60, transform: `scale(${zoom + p * 0.01}) translateY(${(1 - inn) * 120}px)`, transformOrigin: '50% 80%', opacity: inn, WebkitMaskImage: 'linear-gradient(#000 80%, transparent)'}} />
        ) : (
          <div style={{position: 'absolute', left: 150, top: 560, width: 780, height: 780, transform: `scale(${zoom * 0.95}) translateY(${(1 - inn) * 120}px) rotateY(${Math.sin(f / 40) * 8}deg)`, opacity: inn, boxShadow: `0 60px 160px ${c.primary}`, borderRadius: 56, overflow: 'hidden'}}>
            <Art src={cover} colors={c} style={{width: '100%', height: '100%'}} />
          </div>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 55%, transparent 30%, rgba(0,0,0,.8)), linear-gradient(transparent 35%, rgba(0,0,0,.45) 60%, transparent 85%)'}} />
    </AbsoluteFill>
  );
};
