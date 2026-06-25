import { effects, templates, transitions } from './templates';
import type { PresetSettings, StoryPlan, TemplateId } from './types';

const templateCopy: Record<TemplateId, { title: string; subtitle: string; mood: string }> = {
  family: { title: 'Ricordi che restano', subtitle: 'Una storia fatta di sorrisi, dettagli e momenti veri', mood: 'emozionale' },
  travel: { title: 'Il viaggio dentro il viaggio', subtitle: 'Paesaggi, scoperte e strade da ricordare', mood: 'documentary' },
  wedding: { title: 'Il giorno piu atteso', subtitle: 'Eleganza, promesse e luce condivisa', mood: 'romantico' },
  birthday: { title: 'Una festa da ricordare', subtitle: 'Energia, abbracci e sorrisi', mood: 'festoso' },
  kids: { title: 'Piccole grandi meraviglie', subtitle: 'Tenerezza, gioco e stupore', mood: 'dolce' },
  business: { title: 'Visione in movimento', subtitle: 'Persone, risultati e identita aziendale', mood: 'corporate' },
  product: { title: 'Designed to stand out', subtitle: 'Dettagli, benefici e desiderio in movimento', mood: 'premium' },
  tradefair: { title: 'Meet us on the floor', subtitle: 'Uno stand loop chiaro, leggibile e continuo', mood: 'expo' },
  sports: { title: 'Highlights', subtitle: 'Energia, azione e momenti decisivi', mood: 'sportivo' },
  action: { title: 'Action experience', subtitle: 'Adrenalina, squadra e impatto cinematografico', mood: 'epico' }
};

export function buildDemoStory(params: {
  context: string;
  templateId: TemplateId;
  presetSettings: PresetSettings;
  imageNames: string[];
}): StoryPlan {
  const selected = templates.find((item) => item.id === params.templateId) ?? templates[0];
  const copy = templateCopy[params.templateId];
  const names = params.imageNames.length ? params.imageNames : ['intro.jpg', 'momento.jpg', 'finale.jpg'];

  return {
    title: copy.title,
    subtitle: params.context || copy.subtitle,
    detectedMood: copy.mood,
    template: selected.name,
    music: {
      category: params.presetSettings.musicType,
      recommendedTrack: `${params.presetSettings.musicType} - Royalty Free`,
      reason: `Scelta automatica per ritmo ${params.presetSettings.editRhythm}, palette ${params.presetSettings.colorPalette} e tono ${selected.tone}.`
    },
    scenes: names.slice(0, 12).map((name, index) => ({
      imageName: name,
      summary: index === 0 ? 'Apertura narrativa con il contesto dell evento.' : 'Momento significativo con composizione adatta a movimento cinematico.',
      tags: ['persone', 'sorrisi', 'scene importanti'].slice(0, (index % 3) + 1),
      emotion: ['gioia', 'calma', 'energia', 'nostalgia'][index % 4],
      importance: Math.min(10, 7 + (index % 4))
    })),
    chapters: [
      {
        label: 'INTRO',
        title: copy.title,
        text: `Apertura in stile ${params.presetSettings.storyboardStyle}.`,
        effect: 'Slow Zoom',
        transition: params.presetSettings.transitionStyle
      },
      {
        label: 'CAPITOLO 1',
        title: 'La partenza',
        text: `La storia prende forma con ritmo ${params.presetSettings.editRhythm} e scene da ${params.presetSettings.sceneDuration}s.`,
        effect: effects[0],
        transition: params.presetSettings.transitionStyle
      },
      {
        label: 'CAPITOLO 2',
        title: 'Le emozioni',
        text: `Sorrisi, gesti spontanei e scene chiave usano testi ${params.presetSettings.textStyle}.`,
        effect: effects[6],
        transition: transitions[3]
      },
      {
        label: 'CAPITOLO 3',
        title: 'I momenti piu belli',
        text: `Il colore segue la palette ${params.presetSettings.colorPalette} e valorizza le immagini piu intense.`,
        effect: effects[4],
        transition: transitions[2]
      },
      {
        label: 'FINALE',
        title: 'Grazie per questi ricordi',
        text: 'Una chiusura morbida, pronta per TV, tablet e social.',
        effect: effects[5],
        transition: transitions[0]
      }
    ],
    quotes: ['Ogni immagine diventa memoria.', 'Le cose vere meritano un ritmo speciale.'],
    timeline: ['Apertura', 'Prime scene', 'Momenti centrali', 'Crescita emotiva', 'Finale']
  };
}
