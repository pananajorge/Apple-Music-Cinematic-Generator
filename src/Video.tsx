import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Intro} from './scenes/Intro';
import {Lyrics} from './scenes/Lyrics';
import {Artist} from './scenes/Artist';
import {Player} from './scenes/Player';
import {Grain} from './theme';
import {FPS, buildTimeline} from './timeline';
import type {SongConfig} from './types';

const OV = 10; // frames de solape entre escenas (transición)
export const Video: React.FC<SongConfig> = (cfg) => {
  const T = buildTimeline(cfg.duration, cfg.bpm);
  const sf = (p?: string) => (p ? staticFile(p) : undefined);
  const seq = (r: readonly [number, number], first = false) => ({from: r[0] - (first ? 0 : OV), durationInFrames: r[1] - r[0] + (first ? 0 : OV) + OV});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence from={0} durationInFrames={T.card[1] + OV}><Intro cfg={cfg} a={T.intro[1]} total={T.card[1]} /></Sequence>
      <Sequence {...seq(T.lyrics)}><Lyrics cfg={cfg} start={T.lyrics[0]} len={T.lyrics[1] - T.lyrics[0] + OV * 2} /></Sequence>
      <Sequence {...seq(T.artist)}><Artist cfg={cfg} photo={sf(cfg.photo)} cover={sf(cfg.cover)} len={T.artist[1] - T.artist[0] + OV * 2} /></Sequence>
      <Sequence from={T.player[0] - OV} durationInFrames={T.player[1] - T.player[0] + OV}>
        <Player cfg={cfg} cover={sf(cfg.cover)} len={T.player[1] - T.player[0] + OV} closeAt={Math.round(T.total * 28 / 30) - T.player[0] + OV} />
      </Sequence>
      <Grain />
      {cfg.audio && <Audio src={staticFile(cfg.audio)} startFrom={0} volume={(f) => Math.min(1, f / 10, (T.total - f) / 20)} />}
    </AbsoluteFill>
  );
};
export {FPS};
