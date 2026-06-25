export type TemplateId =
  | 'family'
  | 'travel'
  | 'wedding'
  | 'kids'
  | 'birthday'
  | 'business'
  | 'product'
  | 'tradefair'
  | 'sports'
  | 'action';

export type UploadedPhoto = {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  previewUrl: string;
  takenAt: string | null;
  selected: boolean;
};

export type MusicSettings = {
  track: string;
  volume: number;
  fadeIn: number;
  fadeOut: number;
};

export type PresetSettings = {
  editRhythm: string;
  musicType: string;
  colorPalette: string;
  transitionStyle: string;
  textStyle: string;
  sceneDuration: number;
  storyboardStyle: string;
};

export type ExportSettings = {
  resolution: '1080p' | '4K';
  fps: 30 | 60;
};

export type ExportMode = 'standard' | 'fair-tablet';

export type BrandKit = {
  id: string;
  name: string;
  identity: {
    businessName: string;
    slogan: string;
    description: string;
    industry: string;
    website: string;
    email: string;
    phone: string;
    qrUrl: string;
  };
  logos: {
    main: string;
    white: string;
    transparent: string;
    favicon: string;
  };
  colors: {
    primary: string;
    secondary: string;
    cta: string;
    background: string;
    text: string;
  };
  typography: {
    titleFont: string;
    subtitleFont: string;
    bodyFont: string;
  };
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    linkedin: string;
  };
  ctas: string[];
  assets: {
    music: Array<{ name: string; dataUrl: string }>;
    introVideo: string;
    outroVideo: string;
    institutionalImages: Array<{ name: string; dataUrl: string }>;
  };
  qrCode: {
    mode: 'final' | 'cta' | 'always' | 'none';
    label: string;
  };
};

export type VisionScene = {
  imageName: string;
  summary: string;
  tags: string[];
  emotion: string;
  importance: number;
};

export type StoryboardChapter = {
  label: string;
  title: string;
  text: string;
  effect: string;
  transition: string;
};

export type ContentSlideKind = 'service' | 'price' | 'offer' | 'faq' | 'contact' | 'cta' | 'review' | 'reputation';

export type ContentSlide = {
  id: string;
  kind: ContentSlideKind;
  title: string;
  subtitle: string;
  caption: string;
  approved: boolean;
  source: 'website' | 'google';
  rating?: number;
};

export type WebsiteImport = {
  url: string;
  business: {
    name: string;
    slogan: string;
    description: string;
    industry: string;
  };
  services: string[];
  prices: string[];
  offers: string[];
  contacts: string[];
  faqs: Array<{ question: string; answer: string }>;
  strengths: string[];
  testimonials: string[];
  slides: ContentSlide[];
};

export type ReviewsImport = {
  query: string;
  ratingAverage: number | null;
  reviewCount: number | null;
  reputationSummary: string;
  themes: string[];
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    relativeTime: string;
  }>;
  slides: ContentSlide[];
};

export type StoryPlan = {
  title: string;
  subtitle: string;
  detectedMood: string;
  template: string;
  music: {
    category: string;
    recommendedTrack: string;
    reason: string;
  };
  scenes: VisionScene[];
  chapters: StoryboardChapter[];
  quotes: string[];
  timeline: string[];
};

export type GenerateMovieResponse = {
  plan: StoryPlan;
  previewUrl: string;
  exportUrl: string;
  mode: 'ai' | 'demo';
};
