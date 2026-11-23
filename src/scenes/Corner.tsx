import React from 'react';
import {useCurrentFrame, useVideoConfig, spring} from 'remotion';
import {Art, SANS, SeqOffset, tween, usePulse} from '../theme';
import type {SongConfig} from '../types';

// Mini reproductor estilo Apple Music, fijo en una esquina durante toda la música.
export const Corner: React.FC<{cfg: SongConfig; cover?: string; fadeAt: number}> = ({cfg, cover, fadeAt}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = usePulse(cfg);
  const c = cfg.colors;
  const inn = spring({frame: f - 14, fps, config: {damping: 16, stiffness: 100}});
  const out = tween(f, fadeAt, fadeAt + 12, 0, 1);
  const secs = cfg.audioStart + f / fps;
  const total = cfg.songLength ?? 215;
  const bars = [0.6, 1, 0.75, 0.9];
  return (
    <div style={{position: 'absolute', left: 54, top: 120, width: 560, height: 176, borderRadius: 48, padding: 22, boxSizing: 'border-box', display: 'flex', gap: 22, alignItems: 'center', fontFamily: SANS, color: '#fff', background: 'linear-gradient(160deg, rgba(255,255,255,.2), rgba(255,255,255,.06))', backdropFilter: 'blur(40px) saturate(1.6)', border: '1.5px solid rgba(255,255,255,.26)', boxShadow: `0 30px 80px ${c.primary}66`, opacity: inn * (1 - out), transform: `translateY(${(1 - inn) * -60}px) scale(${1 + p * 0.012})`}}>
      <Art src={cover} colors={c} style={{width: 132, height: 132, borderRadius: 26, boxShadow: '0 14px 36px rgba(0,0,0,.5)', flex: 'none'}} />
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div style={{minWidth: 0}}>
            <div style={{fontSize: 40, fontWeight: 700, letterSpacing: -1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{cfg.title}</div>
            <div style={{fontSize: 31, fontWeight: 500, color: 'rgba(255,255,255,.65)'}}>{cfg.artist}</div>
          </div>
          <div style={{display: 'flex', gap: 5, alignItems: 'flex-end', height: 34, marginTop: 6}}>
            {bars.map((b, i) => <div key={i} style={{width: 7, borderRadius: 4, background: '#fff', height: 8 + 26 * Math.abs(Math.sin(f / (5 + i * 2) + i)) * (0.5 + p * 0.5) * b}} />)}
          </div>
        </div>
        <div style={{height: 7, borderRadius: 4, background: 'rgba(255,255,255,.28)', marginTop: 14}}>
          <div style={{width: `${(secs / total) * 100}%`, height: '100%', borderRadius: 4, background: '#fff'}} />
        </div>
      </div>
    </div>
  );
};
export {SeqOffset};
