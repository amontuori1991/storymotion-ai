import type { BrandKit, ContentSlide, ExportMode, ExportSettings, MusicSettings, PresetSettings, StoryPlan, TemplateId } from './types';

export type RenderImage = {
  name: string;
  type: string;
  dataUrl: string;
};

export type RenderProject = {
  images: RenderImage[];
  plan: StoryPlan;
  templateId: TemplateId;
  templateName: string;
  music: MusicSettings;
  presetSettings: PresetSettings;
  exportSettings: ExportSettings;
  exportMode: ExportMode;
  tabletLoop: boolean;
  finalCta: string;
  brandKit: BrandKit | null;
  contentSlides: ContentSlide[];
  filename: string;
};

export type RemotionRenderProps = {
  images: RenderImage[];
  plan: StoryPlan;
  templateName: string;
  music: MusicSettings;
  presetSettings: PresetSettings;
  exportMode: ExportMode;
  tabletLoop: boolean;
  finalCta: string;
  brandKit: BrandKit | null;
  contentSlides: ContentSlide[];
  qrCodeDataUrl: string;
  audioDataUrl: string;
  fps: number;
  width: number;
  height: number;
};
