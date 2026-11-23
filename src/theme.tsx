import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import type {Colors} from './types';
export const SANS = '"SF Pro Display", "Inter Display", Inter, -apple-system, Helvetica, sans-serif';
export const SERIF = 'Georgia, "Liberation Serif", "Times New Roman", serif';
export const ease = Easing.bezier(0.16, 1, 0.3, 1); // expo-out cinematográfico
export const easeIO = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const tween = (f: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(f, [a, b], [from, to], {...clamp, easing: e});
// Pulso 0..1 sincronizado a bpm (1 en cada beat, decae rápido)
export const pulse = (frame: number, fps: number, bpm = 100) => {
  const ph = ((frame / fps) * bpm / 60) % 1;
  return Math.pow(1 - ph, 3);
};
export const Ambient: React.FC<{colors: Colors; strength?: number}> = ({colors, strength = 1}) => {
  const f = useCurrentFrame();
  const a = f / 90;
  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 1500, height: 1500, left: -300 + Math.sin(a) * 160, top: 150 + Math.cos(a * 0.8) * 120, borderRadius: '50%', background: `radial-gradient(circle, ${colors.primary}, transparent 65%)`, opacity: 0.38 * strength, filter: 'blur(60px)'}} />
      <div style={{position: 'absolute', width: 1400, height: 1400, left: 100 + Math.cos(a * 0.9) * 160, top: 700 + Math.sin(a) * 140, borderRadius: '50%', background: `radial-gradient(circle, ${colors.secondary}, transparent 65%)`, opacity: 0.3 * strength, filter: 'blur(70px)'}} />
    </AbsoluteFill>
  );
};
export const Grain: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'overlay', opacity: 0.12, backgroundImage: 'radial-gradient(rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '5px 5px'}} />
);
export const Art: React.FC<{src?: string; colors: Colors; style?: React.CSSProperties}> = ({src, colors, style}) =>
  src ? (
    <img src={src} style={{objectFit: 'cover', ...style}} />
  ) : (
    <div style={{...style, background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary} 55%, ${colors.secondary})`}} />
  );
