import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {FPS, buildTimeline} from './timeline';
import type {SongConfig} from './types';
import example from '../public/songs/example/song.json';

export const Root: React.FC = () => (
  <Composition
    id="MusicVideo"
    component={Video as React.FC<any>}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={buildTimeline(30).total}
    defaultProps={example as SongConfig}
    calculateMetadata={({props}) => ({durationInFrames: buildTimeline((props as SongConfig).duration, (props as SongConfig).bpm).total})}
  />
);
