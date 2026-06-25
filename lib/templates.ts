import type { TemplateId } from './types';

export const templates: Array<{
  id: TemplateId;
  name: string;
  tone: string;
  music: string;
  editRhythm: string;
  colorPalette: string;
  transitionStyle: string;
  textStyle: string;
  sceneDuration: number;
  storyboardStyle: string;
}> = [
  {
    id: 'family',
    name: 'Family Memories',
    tone: 'emozionale, caldo, intimo',
    music: 'Emotional Piano',
    editRhythm: 'Lento emozionale',
    colorPalette: 'Warm Film',
    transitionStyle: 'Cross Dissolve',
    textStyle: 'Fade Up elegante',
    sceneDuration: 4.5,
    storyboardStyle: 'Intro affettiva, capitoli per sorrisi e dettagli, finale nostalgico'
  },
  {
    id: 'travel',
    name: 'Travel Documentary',
    tone: 'documentaristico, ampio, avventuroso',
    music: 'Cinematic Journey',
    editRhythm: 'Medio cinematografico',
    colorPalette: 'Teal Gold',
    transitionStyle: 'Smooth Zoom',
    textStyle: 'Netflix Documentary',
    sceneDuration: 3.8,
    storyboardStyle: 'Mappa emotiva del viaggio, luoghi, scoperta, climax panoramico'
  },
  {
    id: 'wedding',
    name: 'Wedding Story',
    tone: 'elegante, romantico, luminoso',
    music: 'Elegant Strings',
    editRhythm: 'Lento premium',
    colorPalette: 'Soft Ivory',
    transitionStyle: 'Cinematic Blur',
    textStyle: 'Letter Spacing Animation',
    sceneDuration: 5,
    storyboardStyle: 'Preparativi, cerimonia, promesse, festa, chiusura poetica'
  },
  {
    id: 'birthday',
    name: 'Birthday Party',
    tone: 'festoso, dinamico, colorato',
    music: 'Celebration Pop',
    editRhythm: 'Veloce gioioso',
    colorPalette: 'Bright Pop',
    transitionStyle: 'Flash Transition',
    textStyle: 'Slide In giocoso',
    sceneDuration: 2.8,
    storyboardStyle: 'Arrivo invitati, torta, sorrisi, momenti sorpresa, finale energico'
  },
  {
    id: 'kids',
    name: 'Kids Event',
    tone: 'dolce, giocoso, tenero',
    music: 'Soft Ukulele',
    editRhythm: 'Medio morbido',
    colorPalette: 'Pastel Clean',
    transitionStyle: 'Cross Dissolve',
    textStyle: 'Typewriter soft',
    sceneDuration: 3.6,
    storyboardStyle: 'Giochi, spontaneita, piccoli dettagli, abbracci, chiusura tenera'
  },
  {
    id: 'business',
    name: 'Business Presentation',
    tone: 'pulito, premium, autorevole',
    music: 'Corporate Pulse',
    editRhythm: 'Medio preciso',
    colorPalette: 'Graphite Blue',
    transitionStyle: 'Dynamic Swipe',
    textStyle: 'Keynote Minimal',
    sceneDuration: 3.2,
    storyboardStyle: 'Problema, soluzione, team, prova, call to action'
  },
  {
    id: 'product',
    name: 'Product Showcase',
    tone: 'premium, dettagliato, commerciale',
    music: 'Luxury Tech Pulse',
    editRhythm: 'Medio premium',
    colorPalette: 'Studio Contrast',
    transitionStyle: 'Morph Transition',
    textStyle: 'Cinematic Reveal',
    sceneDuration: 3,
    storyboardStyle: 'Hero prodotto, dettagli, benefici, use case, finale brand'
  },
  {
    id: 'tradefair',
    name: 'Trade Fair Booth Loop',
    tone: 'fieristico, alto contrasto, leggibile anche senza audio',
    music: 'Action Corporate Loop',
    editRhythm: 'Veloce energico',
    colorPalette: 'High Contrast',
    transitionStyle: 'Smooth Zoom',
    textStyle: 'Bold Booth Captions',
    sceneDuration: 2.4,
    storyboardStyle: 'Schermate brevi, massimo 5 parole, demo chiara, CTA finale visibile, loop fluido'
  },
  {
    id: 'sports',
    name: 'Sports Highlights',
    tone: 'energetico, competitivo, adrenalinico',
    music: 'Sport Energy Beat',
    editRhythm: 'Veloce highlights',
    colorPalette: 'High Contrast',
    transitionStyle: 'Flash Transition',
    textStyle: 'Impact Titles',
    sceneDuration: 2.2,
    storyboardStyle: 'Warm up, azione, gesti tecnici, vittoria, replay emotivo'
  },
  {
    id: 'action',
    name: 'Action Experience',
    tone: 'action, epico, immersivo',
    music: 'Epic Action Drums',
    editRhythm: 'Veloce epico',
    colorPalette: 'Cinematic Steel',
    transitionStyle: 'Cinematic Blur',
    textStyle: 'Netflix Action Reveal',
    sceneDuration: 2.4,
    storyboardStyle: 'Briefing, tensione, azione, squadra, climax, finale eroico'
  }
];

export function presetSettingsFromTemplate(template: (typeof templates)[number]) {
  return {
    editRhythm: template.editRhythm,
    musicType: template.music,
    colorPalette: template.colorPalette,
    transitionStyle: template.transitionStyle,
    textStyle: template.textStyle,
    sceneDuration: template.sceneDuration,
    storyboardStyle: template.storyboardStyle
  };
}

export const effects = [
  'Ken Burns Effect',
  'Slow Zoom',
  'Pan Left',
  'Pan Right',
  'Push In',
  'Push Out',
  'Depth Effect'
];

export const cinematicEffects = ['Lens Flare', 'Light Leaks', 'Film Grain leggero', 'Glow morbido'];

export const transitions = [
  'Cross Dissolve',
  'Smooth Zoom',
  'Dynamic Swipe',
  'Cinematic Blur',
  'Flash Transition',
  'Morph Transition'
];

export const animatedTexts = [
  'Fade Up',
  'Typewriter',
  'Cinematic Reveal',
  'Letter Spacing Animation',
  'Slide In'
];
