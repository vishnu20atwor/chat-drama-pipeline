import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Chat, calcMeta} from './Chat.jsx';
import {FPS, H, W} from './theme.js';
import sample from '../content/sample.json';
import sampleAudio from '../content/sample.audio.json';

const Root = () => (
  <Composition
    id="Chat"
    component={Chat}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={1500}
    defaultProps={{content: sample, audio: sampleAudio}}
    calculateMetadata={calcMeta}
  />
);

registerRoot(Root);
