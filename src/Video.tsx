import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Intro} from './scenes/Intro';
import {Lyrics} from './scenes/Lyrics';
import {Artist} from './scenes/Artist';
import {Corner} from './scenes/Corner';
import {Grain, SeqOffset, easeIO, tween} from './theme';
import {FPS, buildTimeline} from './timeline';
import type {SongConfig} from './types';

const OV = 10; // frames de solape entre escenas
// Cierre: la cámara se aleja, destello y fundido a negro.
const Closer: React.FC<{at: number; end: number; accent: string; children: React.ReactNode}> = ({at, end, accent, children}) => {
  const f = useCurrentFrame();
  const k = tween(f, at, end, 0, 1, easeIO);
  const flash = tween(f, at + 4, at + 14, 0, 1) * (1 - tween(f, at + 14, end - 2, 0, 1));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: k > 0 ? `scale(${1 - k * 0.2}) rotateX(${k * 10}deg)` : undefined, perspective: k > 0 ? 1600 : undefined, filter: k > 0.02 ? `blur(${k * 10}px)` : undefined, opacity: 1 - tween(f, end - 20, end, 0, 1)}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(circle, ${accent}, transparent 60%)`, opacity: flash * 0.5, mixBlendMode: 'screen'}} />
    </AbsoluteFill>
  );
};

// Estructura: intro luminosa -> tarjeta con la foto -> fondo del artista; letras y mini reproductor fijos todo el video.
export const Video: React.FC<SongConfig> = (cfg) => {
  const T = buildTimeline(cfg.duration, cfg.bpm, cfg.beats);
  const sf = (p?: string) => (p ? staticFile(p) : undefined);
  const mainFrom = T.card[1] - OV;
  const closeAt = T.total - Math.round(2 * FPS);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Closer at={closeAt} end={T.total} accent={cfg.colors.accent}>
        <Sequence from={0} durationInFrames={T.card[1] + OV}><SeqOffset.Provider value={0}><Intro cfg={cfg} a={T.intro[1]} total={T.card[1]} photo={sf(cfg.photo)} /></SeqOffset.Provider></Sequence>
        <Sequence from={mainFrom} durationInFrames={T.total - mainFrom}><SeqOffset.Provider value={mainFrom}><Artist cfg={cfg} photo={sf(cfg.photo)} cover={sf(cfg.cover)} len={T.total - mainFrom} /></SeqOffset.Provider></Sequence>
        <Sequence from={0} durationInFrames={T.total}><Lyrics cfg={cfg} introEnd={T.card[1]} /></Sequence>
        <Sequence from={0} durationInFrames={T.total}><Corner cfg={cfg} cover={sf(cfg.cover)} fadeAt={closeAt + 4} /></Sequence>
      </Closer>
      <Grain />
      {cfg.audio && <Audio src={staticFile(cfg.audio)} startFrom={0} volume={(f) => Math.min(1, f / 10, (T.total - f) / 20)} />}
    </AbsoluteFill>
  );
};
export {FPS};
