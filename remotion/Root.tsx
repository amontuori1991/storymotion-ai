import React from 'react';
import { Composition } from 'remotion';
import { registerRoot } from 'remotion';
import { StoryMotionVideo } from './StoryMotionVideo';
import type { RemotionRenderProps } from '../lib/render-types';

const defaultProps: RemotionRenderProps = {
  images: [],
  plan: {
    title: 'StoryMotion AI',
    subtitle: 'Video generato automaticamente',
    detectedMood: 'cinematic',
    template: 'Family Memories',
    music: {
      category: 'Emotional Piano',
      recommendedTrack: 'Emotional Piano',
      reason: 'Default local track'
    },
    scenes: [],
    chapters: [],
    quotes: [],
    timeline: []
  },
  templateName: 'Family Memories',
  music: {
    track: 'Emotional Piano',
    volume: 80,
    fadeIn: 2,
    fadeOut: 2
  },
  presetSettings: {
    editRhythm: 'Lento emozionale',
    musicType: 'Emotional Piano',
    colorPalette: 'Warm Film',
    transitionStyle: 'Cross Dissolve',
    textStyle: 'Fade Up elegante',
    sceneDuration: 4,
    storyboardStyle: 'Intro, capitoli emozionali, finale'
  },
  exportMode: 'standard',
  tabletLoop: false,
  finalCta: 'Visita lo stand',
  brandKit: null,
  contentSlides: [],
  qrCodeDataUrl: '',
  audioDataUrl: '',
  fps: 30,
  width: 1920,
  height: 1080
};

export const RemotionRoot = () => (
  <Composition
    id="StoryMotionVideo"
    component={StoryMotionVideo}
    defaultProps={defaultProps}
    durationInFrames={120}
    fps={30}
    width={1920}
    height={1080}
    calculateMetadata={({ props }) => {
      const renderProps = props as RemotionRenderProps;
      const fps = renderProps.fps || 30;
      const sceneCount = Math.max(1, renderProps.images.length || renderProps.plan.chapters.length || 1);
      const sceneFrames = Math.max(45, Math.round((renderProps.presetSettings.sceneDuration || 4) * fps));
      const fairDuration = Math.round(75 * fps);

      return {
        durationInFrames: renderProps.exportMode === 'fair-tablet' ? fairDuration : sceneCount * sceneFrames + Math.round(fps * 2),
        fps,
        width: renderProps.width || 1920,
        height: renderProps.height || 1080
      };
    }}
  />
);

registerRoot(RemotionRoot);
