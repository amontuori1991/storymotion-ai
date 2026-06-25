'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import * as exifr from 'exifr';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileDown,
  FileUp,
  Film,
  Fullscreen,
  ImagePlus,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  TabletSmartphone,
  Trash2,
  Wand2
} from 'lucide-react';
import { animatedTexts, cinematicEffects, effects, presetSettingsFromTemplate, templates, transitions } from '@/lib/templates';
import type { BrandKit, ExportMode, ExportSettings, GenerateMovieResponse, MusicSettings, PresetSettings, StoryPlan, TemplateId, UploadedPhoto } from '@/lib/types';
import type { ContentSlide, ReviewsImport, WebsiteImport } from '@/lib/types';

const MAX_IMAGES = 300;

const acceptedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const brandKitStorageKey = 'storymotion-brand-kits';
const settingsStorageKey = 'storymotion-settings';

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxSize = 1920, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type.includes('heic') || file.size < 1_800_000) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.(png|jpe?g)$/i, '.jpg'), { type: 'image/jpeg' });
}

async function imageToPayloadDataUrl(file: File, maxSize: number, quality: number): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas non disponibile');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('Compressione immagine non riuscita');
    return fileToDataUrl(new File([blob], file.name.replace(/\.(heic|heif|png|jpe?g)$/i, '.jpg'), { type: 'image/jpeg' }));
  } catch {
    if (file.size <= 750_000) return fileToDataUrl(file);
    throw new Error(`Immagine troppo pesante o non leggibile: ${file.name}. Converti in JPG/PNG o deselezionala prima del render.`);
  }
}

type ImagePayload = {
  name: string;
  type: string;
  dataUrl: string;
};

function limitWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ');
}

function fairOptimizedPlan(plan: StoryPlan, finalCta: string): StoryPlan {
  return {
    ...plan,
    title: limitWords(plan.title || 'Demo chiara', 5),
    subtitle: limitWords(plan.subtitle || 'Guarda cosa facciamo', 5),
    chapters: [
      { label: 'INTRO', title: 'Attira attenzione', text: 'Soluzione immediata', effect: 'Slow Zoom', transition: 'Smooth Zoom' },
      { label: 'DEMO', title: 'Mostra il valore', text: 'Vantaggi chiari', effect: 'Ken Burns Effect', transition: 'Cross Dissolve' },
      { label: 'PROVA', title: 'Guarda i dettagli', text: 'Risultato concreto', effect: 'Pan Left', transition: 'Dynamic Swipe' },
      { label: 'CTA', title: limitWords(finalCta, 5), text: 'Parla con noi', effect: 'Push In', transition: 'Cross Dissolve' }
    ],
    timeline: ['Attenzione', 'Demo', 'Benefici', 'Prova', limitWords(finalCta, 5)],
    scenes: plan.scenes.map((scene) => ({
      ...scene,
      summary: limitWords(scene.summary, 5)
    }))
  };
}

function createEmptyBrandKit(name = 'Nuovo Brand Kit'): BrandKit {
  return {
    id: crypto.randomUUID(),
    name,
    identity: {
      businessName: name,
      slogan: '',
      description: '',
      industry: '',
      website: '',
      email: '',
      phone: '',
      qrUrl: ''
    },
    logos: {
      main: '',
      white: '',
      transparent: '',
      favicon: ''
    },
    colors: {
      primary: '#3B82F6',
      secondary: '#111827',
      cta: '#3B82F6',
      background: '#0A0A0A',
      text: '#FFFFFF'
    },
    typography: {
      titleFont: 'Montserrat',
      subtitleFont: 'Inter',
      bodyFont: 'Poppins'
    },
    social: {
      facebook: '',
      instagram: '',
      tiktok: '',
      youtube: '',
      linkedin: ''
    },
    ctas: ['Prenota ora', 'Richiedi informazioni', 'Visita il sito', 'Contattaci', 'Scopri di piu'],
    assets: {
      music: [],
      introVideo: '',
      outroVideo: '',
      institutionalImages: []
    },
    qrCode: {
      mode: 'final',
      label: 'Scansiona il QR Code'
    }
  };
}

function normalizeBrandKit(kit: BrandKit): BrandKit {
  return {
    ...kit,
    identity: {
      ...kit.identity,
      qrUrl: kit.identity.qrUrl || kit.identity.website || ''
    },
    qrCode: kit.qrCode ?? {
      mode: 'final',
      label: 'Scansiona il QR Code'
    }
  };
}

const starterBrandKits = [
  createEmptyBrandKit('Full Metal Paintball Carmagnola'),
  createEmptyBrandKit('NextStake'),
  createEmptyBrandKit('Azerouno'),
  createEmptyBrandKit('Cliente XYZ')
].map((kit, index) => ({
  ...kit,
  colors: index === 0 ? { ...kit.colors, primary: '#22C55E', cta: '#EF4444' } : kit.colors
}));

export default function Home() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [context, setContext] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>('family');
  const [music, setMusic] = useState<MusicSettings>({
    track: 'Auto AI Selection',
    volume: 78,
    fadeIn: 2,
    fadeOut: 3
  });
  const [presetSettings, setPresetSettings] = useState<PresetSettings>(() => presetSettingsFromTemplate(templates[0]));
  const [exportSettings, setExportSettings] = useState<ExportSettings>({ resolution: '1080p', fps: 30 });
  const [exportMode, setExportMode] = useState<ExportMode>('standard');
  const [tabletLoop, setTabletLoop] = useState(false);
  const [finalCta, setFinalCta] = useState('Visita lo stand');
  const [contentMode, setContentMode] = useState<'photos' | 'photos-site' | 'site-only'>('photos');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteImport, setWebsiteImport] = useState<WebsiteImport | null>(null);
  const [reviewQuery, setReviewQuery] = useState('');
  const [reviewMode, setReviewMode] = useState('all');
  const [reviewsImport, setReviewsImport] = useState<ReviewsImport | null>(null);
  const [isImportingWebsite, setIsImportingWebsite] = useState(false);
  const [isImportingReviews, setIsImportingReviews] = useState(false);
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [selectedBrandKitId, setSelectedBrandKitId] = useState('');
  const [result, setResult] = useState<GenerateMovieResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderPhaseMessage, setRenderPhaseMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState('storymotion-ai.mp4');
  const [filename, setFilename] = useState('storymotion-ai');
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSettings, setClientSettings] = useState<{ openAiApiKey?: string; googlePlacesApiKey?: string }>({});

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === templateId) ?? templates[0], [templateId]);
  const selectedBrandKit = useMemo(() => brandKits.find((kit) => kit.id === selectedBrandKitId) ?? null, [brandKits, selectedBrandKitId]);
  const approvedContentSlides = useMemo(
    () => [...(websiteImport?.slides ?? []), ...(reviewsImport?.slides ?? [])].filter((slide) => slide.approved),
    [websiteImport, reviewsImport]
  );
  const selectedPhotos = useMemo(() => photos.filter((photo) => photo.selected !== false), [photos]);
  const canGenerate = selectedPhotos.length > 0 || approvedContentSlides.length > 0 || contentMode === 'site-only';

  useEffect(() => {
    const raw = window.localStorage.getItem(brandKitStorageKey);
    const loaded = (raw ? (JSON.parse(raw) as BrandKit[]) : starterBrandKits).map(normalizeBrandKit);
    setBrandKits(loaded);
    setSelectedBrandKitId(loaded[0]?.id ?? '');
    setFinalCta(loaded[0]?.ctas[0] ?? 'Visita lo stand');
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(settingsStorageKey);
    if (raw) setClientSettings(JSON.parse(raw));
  }, []);

  useEffect(() => {
    if (brandKits.length > 0) {
      window.localStorage.setItem(brandKitStorageKey, JSON.stringify(brandKits));
    }
  }, [brandKits]);

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList)
      .filter((file) => acceptedTypes.includes(file.type) || /\.(jpe?g|png|heic|heif)$/i.test(file.name))
      .slice(0, Math.max(0, MAX_IMAGES - photos.length));

    const mapped = await Promise.all(
      files.map(async (file) => {
        let takenAt: string | null = null;
        try {
          const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
          const date = exif?.DateTimeOriginal ?? exif?.CreateDate;
          takenAt = date instanceof Date ? date.toISOString() : null;
        } catch {
          takenAt = null;
        }

        const optimizedFile = await compressImage(file).catch(() => file);

        return {
          id: crypto.randomUUID(),
          file: optimizedFile,
          name: optimizedFile.name,
          type: optimizedFile.type || 'image/*',
          size: optimizedFile.size,
          previewUrl: URL.createObjectURL(optimizedFile),
          takenAt,
          selected: true
        };
      })
    );

    setPhotos((current) =>
      [...current, ...mapped].sort((left, right) => {
        if (!left.takenAt && !right.takenAt) return 0;
        if (!left.takenAt) return 1;
        if (!right.takenAt) return -1;
        return new Date(left.takenAt).getTime() - new Date(right.takenAt).getTime();
      })
    );
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const removed = current.find((photo) => photo.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
    setDownloadUrl(null);
    setRenderProgress(0);
  }

  function togglePhotoSelection(id: string) {
    setPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, selected: !photo.selected } : photo)));
    setDownloadUrl(null);
    setRenderProgress(0);
  }

  function setAllPhotoSelection(selected: boolean) {
    setPhotos((current) => current.map((photo) => ({ ...photo, selected })));
    setDownloadUrl(null);
    setRenderProgress(0);
  }

  function updateSelectedBrandKit(updater: (kit: BrandKit) => BrandKit) {
    setBrandKits((current) => current.map((kit) => (kit.id === selectedBrandKitId ? updater(kit) : kit)));
    setDownloadUrl(null);
    setRenderProgress(0);
  }

  function createBrandKit() {
    const kit = createEmptyBrandKit(`Brand Kit ${brandKits.length + 1}`);
    setBrandKits((current) => [...current, kit]);
    setSelectedBrandKitId(kit.id);
    setFinalCta(kit.ctas[0]);
  }

  function deleteBrandKit() {
    if (!selectedBrandKit) return;
    setBrandKits((current) => {
      const next = current.filter((kit) => kit.id !== selectedBrandKit.id);
      setSelectedBrandKitId(next[0]?.id ?? '');
      setFinalCta(next[0]?.ctas[0] ?? 'Visita lo stand');
      return next;
    });
  }

  function exportBrandKit() {
    if (!selectedBrandKit) return;
    const blob = new Blob([JSON.stringify(selectedBrandKit, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedBrandKit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-brand-kit.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBrandKit(file: File) {
    const text = await file.text();
    const imported = JSON.parse(text) as BrandKit;
    const kit = { ...imported, id: crypto.randomUUID(), name: imported.name || 'Brand Kit importato' };
    setBrandKits((current) => [...current, kit]);
    setSelectedBrandKitId(kit.id);
    setFinalCta(kit.ctas[0] ?? 'Visita il sito');
  }

  async function setBrandLogo(field: keyof BrandKit['logos'], file: File) {
    const dataUrl = await fileToDataUrl(file);
    updateSelectedBrandKit((kit) => ({ ...kit, logos: { ...kit.logos, [field]: dataUrl } }));
  }

  async function setBrandVideo(field: 'introVideo' | 'outroVideo', file: File) {
    const dataUrl = await fileToDataUrl(file);
    updateSelectedBrandKit((kit) => ({ ...kit, assets: { ...kit.assets, [field]: dataUrl } }));
  }

  async function addBrandMusic(files: FileList | null) {
    if (!files) return;
    const uploads = await Promise.all(Array.from(files).map(async (file) => ({ name: file.name, dataUrl: await fileToDataUrl(file) })));
    updateSelectedBrandKit((kit) => ({ ...kit, assets: { ...kit.assets, music: [...kit.assets.music, ...uploads] } }));
  }

  async function addInstitutionalImages(files: FileList | null) {
    if (!files) return;
    const uploads = await Promise.all(Array.from(files).map(async (file) => ({ name: file.name, dataUrl: await fileToDataUrl(file) })));
    updateSelectedBrandKit((kit) => ({ ...kit, assets: { ...kit.assets, institutionalImages: [...kit.assets.institutionalImages, ...uploads] } }));
  }

  async function importWebsiteContent() {
    setIsImportingWebsite(true);
    setError(null);
    try {
      const response = await fetch('/api/import-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(clientSettings.openAiApiKey ? { 'x-openai-api-key': clientSettings.openAiApiKey } : {}) },
        body: JSON.stringify({ url: websiteUrl })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Import sito non riuscito');
      setWebsiteImport(data as WebsiteImport);
      setContentMode((current) => (current === 'photos' ? 'photos-site' : current));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import sito non riuscito');
    } finally {
      setIsImportingWebsite(false);
    }
  }

  async function importGoogleReviews() {
    setIsImportingReviews(true);
    setError(null);
    try {
      const response = await fetch('/api/import-google-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(clientSettings.googlePlacesApiKey ? { 'x-google-places-api-key': clientSettings.googlePlacesApiKey } : {}) },
        body: JSON.stringify({ query: reviewQuery, mode: reviewMode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Import recensioni non riuscito');
      setReviewsImport(data as ReviewsImport);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import recensioni non riuscito');
    } finally {
      setIsImportingReviews(false);
    }
  }

  function updateContentSlide(source: 'website' | 'google', id: string, patch: Partial<ContentSlide>) {
    const updater = (slides: ContentSlide[]) => slides.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide));
    if (source === 'website') {
      setWebsiteImport((current) => (current ? { ...current, slides: updater(current.slides) } : current));
    } else {
      setReviewsImport((current) => (current ? { ...current, slides: updater(current.slides) } : current));
    }
    setDownloadUrl(null);
    setRenderProgress(0);
  }

  function addManualContentSlide(source: 'website' | 'google') {
    const slide: ContentSlide = {
      id: crypto.randomUUID(),
      kind: source === 'website' ? 'cta' : 'review',
      title: source === 'website' ? 'CONTATTACI' : '★★★★★',
      subtitle: source === 'website' ? 'Scopri di piu' : 'Cliente soddisfatto',
      caption: source === 'website' ? websiteUrl : 'Recensione approvata',
      approved: true,
      source
    };
    if (source === 'website') {
      setWebsiteImport((current) => (current ? { ...current, slides: [...current.slides, slide] } : current));
    } else {
      setReviewsImport((current) => (current ? { ...current, slides: [...current.slides, slide] } : current));
    }
  }

  async function generateFilm(overrides?: {
    templateId?: TemplateId;
    music?: MusicSettings;
    presetSettings?: PresetSettings;
    exportSettings?: ExportSettings;
    exportMode?: ExportMode;
    finalCta?: string;
  }) {
    setIsGenerating(true);
    setError(null);

    try {
      const nextTemplateId = overrides?.templateId ?? templateId;
      const nextMusic = overrides?.music ?? music;
      const nextPresetSettings = overrides?.presetSettings ?? presetSettings;
      const nextExportSettings = overrides?.exportSettings ?? exportSettings;
      const nextExportMode = overrides?.exportMode ?? exportMode;
      const nextFinalCta = overrides?.finalCta ?? finalCta;
      const imageResults = await Promise.all(
        (contentMode === 'site-only' ? [] : selectedPhotos).slice(0, 12).map(async (photo) => {
          try {
            return {
              name: photo.name,
              type: 'image/jpeg',
              dataUrl: await imageToPayloadDataUrl(photo.file, 720, 0.68)
            };
          } catch {
            return null;
          }
        })
      );
      const images = imageResults.filter((image): image is ImagePayload => Boolean(image));

      if (selectedPhotos.length > 0 && images.length === 0 && contentMode !== 'site-only') {
        throw new Error('Le immagini selezionate non possono essere lette dal browser. Prova a convertirle in JPG/PNG o deseleziona i file non supportati.');
      }

      const response = await fetch('/api/generate-film', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(clientSettings.openAiApiKey ? { 'x-openai-api-key': clientSettings.openAiApiKey } : {}) },
        body: JSON.stringify({
          context,
          templateId: nextTemplateId,
          music: nextMusic,
          presetSettings: nextPresetSettings,
          brandKit: selectedBrandKit,
          importedContent: {
            website: websiteImport,
            reviews: reviewsImport,
            mode: contentMode
          },
          exportSettings: nextExportSettings,
          images
        })
      });

      if (!response.ok) throw new Error('Generazione non riuscita');
      const generated = (await response.json()) as GenerateMovieResponse;
      setResult(nextExportMode === 'fair-tablet' ? { ...generated, plan: fairOptimizedPlan(generated.plan, nextFinalCta) } : generated);
      setDownloadUrl(null);
      setRenderProgress(0);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Errore inatteso');
    } finally {
      setIsGenerating(false);
    }
  }

  function applyFairTabletMode() {
    const tradeFair = templates.find((template) => template.id === 'tradefair') ?? templates[0];
    const tradeFairSettings = presetSettingsFromTemplate(tradeFair);
    const nextMusic = { ...music, track: tradeFair.music, volume: 82, fadeIn: 1, fadeOut: 1 };
    const nextExport = { resolution: '1080p', fps: 30 } as ExportSettings;

    setTemplateId('tradefair');
    setMusic(nextMusic);
    setPresetSettings({ ...tradeFairSettings, sceneDuration: 2.4, transitionStyle: 'Smooth Zoom', colorPalette: 'High Contrast' });
    setExportSettings(nextExport);
    setExportMode('fair-tablet');
    setTabletLoop(true);
    setFinalCta('PRENOTA ORA');
    if (selectedBrandKit) {
      updateSelectedBrandKit((kit) => ({
        ...kit,
        identity: {
          ...kit.identity,
          qrUrl: kit.identity.qrUrl || kit.identity.website || 'https://www.paintballcarmagnola.com',
          website: kit.identity.website || 'www.paintballcarmagnola.com'
        },
        qrCode: {
          mode: 'final',
          label: 'Scansiona il QR Code'
        }
      }));
    }
    setDownloadUrl(null);
    setRenderProgress(0);

    if (selectedPhotos.length > 0) {
      void generateFilm({
        templateId: 'tradefair',
        music: nextMusic,
        presetSettings: { ...tradeFairSettings, sceneDuration: 2.4, transitionStyle: 'Smooth Zoom', colorPalette: 'High Contrast' },
        exportSettings: nextExport,
        exportMode: 'fair-tablet',
        finalCta: 'PRENOTA ORA'
      });
    }
  }

  function updatePlan(updater: (plan: StoryPlan) => StoryPlan) {
    setResult((current) => (current ? { ...current, plan: updater(current.plan) } : current));
    setDownloadUrl(null);
    setRenderProgress(0);
  }

  function regenerateTexts() {
    if (!result) return;
    updatePlan((plan) => fairOptimizedPlan(plan, finalCta));
  }

  function regenerateStoryboard() {
    if (!result) return;
    updatePlan((plan) => ({
      ...fairOptimizedPlan(plan, finalCta),
      chapters: [
        { label: 'INTRO', title: 'Fermati qui', text: 'Scopri la soluzione', effect: 'Slow Zoom', transition: 'Smooth Zoom' },
        { label: 'VALORE', title: 'Risultati visibili', text: 'In pochi secondi', effect: 'Pan Right', transition: 'Cross Dissolve' },
        { label: 'DEMO', title: 'Guarda come funziona', text: 'Esperienza immediata', effect: 'Push In', transition: 'Dynamic Swipe' },
        { label: 'CTA', title: limitWords(finalCta, 5), text: 'Parliamone ora', effect: 'Push Out', transition: 'Cross Dissolve' }
      ]
    }));
  }

  function quickPreview() {
    setIsPlaying(true);
    window.requestAnimationFrame(() => document.getElementById('preview-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }

  async function renderFilm() {
    if (!result) return;

    setIsRendering(true);
    setRenderProgress(3);
    setRenderPhaseMessage('Preparazione immagini...');
    setError(null);

    try {
      const renderMaxSize = exportMode === 'fair-tablet' ? 1600 : 1920;
      const renderQuality = exportMode === 'fair-tablet' ? 0.76 : 0.82;
      const images = await Promise.all(
        (contentMode === 'site-only' ? [] : selectedPhotos).slice(0, 60).map(async (photo, index) => {
          const dataUrl = await imageToPayloadDataUrl(photo.file, renderMaxSize, renderQuality);
          const uploadResponse = await fetch('/api/storage/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: `render-${index + 1}-${photo.name.replace(/\.(heic|heif|png|jpe?g)$/i, '.jpg')}`,
              contentType: 'image/jpeg',
              dataUrl
            })
          });
          const upload = (await uploadResponse.json().catch(() => null)) as { url?: string; error?: string; message?: string } | null;
          if (!uploadResponse.ok || !upload?.url) throw new Error(upload?.error ?? upload?.message ?? 'Upload immagine non riuscito');
          return {
            name: photo.name,
            type: 'image/jpeg',
            dataUrl: upload.url
          };
        })
      );

      const response = await fetch('/api/render-film', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          images,
          plan: result.plan,
          templateName: selectedTemplate.name,
          music,
          presetSettings,
          exportMode,
          tabletLoop,
          finalCta,
          brandKit: selectedBrandKit,
          contentSlides: approvedContentSlides,
          exportSettings
        })
      });

      if (!response.ok || !response.body) {
        const details = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;
        throw new Error(details?.details ? `${details.error} ${details.details}` : details?.error ?? 'Rendering fallito');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          let eventType = 'message';
          let data = '';
          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            if (line.startsWith('data: ')) data = line.slice(6).trim();
          }
          if (!data) continue;
          try {
            const eventData = JSON.parse(data) as {
              phase?: string;
              progress?: number;
              message?: string;
              url?: string;
              filename?: string;
            };
            if (eventType === 'progress') {
              if (eventData.progress !== undefined) setRenderProgress(eventData.progress);
              if (eventData.message) setRenderPhaseMessage(eventData.message);
            } else if (eventType === 'done') {
              // Normalizza l'URL ricevuto:
              // - URL assoluto https:// (Vercel Blob): usato direttamente
              // - URL relativo /api/...: risolto contro l'origin corrente del browser
              // - URL localhost con porta diversa: normalizzato all'origin corrente
              const rawUrl = eventData.url ?? '';
              const resolvedFilename = eventData.filename ?? `${filename || 'storymotion-ai'}.mp4`;
              let resolvedUrl = rawUrl;
              try {
                if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
                  resolvedUrl = rawUrl;
                } else if (rawUrl.startsWith('/')) {
                  resolvedUrl = new URL(rawUrl, window.location.origin).toString();
                } else if (rawUrl.startsWith('http')) {
                  const parsed = new URL(rawUrl);
                  resolvedUrl =
                    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
                      ? new URL(parsed.pathname + parsed.search, window.location.origin).toString()
                      : rawUrl;
                }
              } catch {
                resolvedUrl = rawUrl;
              }
              console.log('[StoryMotion] done event', { rawUrl, resolvedUrl, filename: resolvedFilename });

              setRenderPhaseMessage('Download video...');
              setRenderProgress(98);

              let fetchError: string | null = null;
              try {
                const videoRes = await fetch(resolvedUrl);
                if (!videoRes.ok) throw new Error(`HTTP ${videoRes.status} ${videoRes.statusText}`);
                const videoBlob = await videoRes.blob();
                if (downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(downloadUrl);
                setDownloadUrl(URL.createObjectURL(videoBlob));
                setDownloadName(resolvedFilename);
                setRenderProgress(100);
                setRenderPhaseMessage('');
              } catch (fetchErr) {
                fetchError =
                  `Video generato ma download non riuscito. Apri manualmente: ${resolvedUrl}` +
                  (fetchErr instanceof Error ? ` (${fetchErr.message})` : '');
              }

              if (fetchError) throw new Error(fetchError);
              break outer;
            } else if (eventType === 'error') {
              throw new Error(eventData.message ?? 'Rendering fallito');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }
    } catch (renderError) {
      setRenderProgress(0);
      setRenderPhaseMessage('');
      setError(renderError instanceof Error ? renderError.message : 'Rendering reale non disponibile. Configurare Remotion/FFmpeg.');
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-white/60">
              <Sparkles className="h-4 w-4 text-electric" />
              AI Auto Video Story Creator
            </div>
            <h1 className="text-3xl font-semibold tracking-normal sm:text-5xl">StoryMotion AI</h1>
            <Link className="mt-2 inline-block text-sm text-white/45 hover:text-white" href="/settings">
              Settings API & produzione
            </Link>
          </div>
          <button
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-md bg-electric px-5 font-semibold text-white shadow-glow transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGenerating || !canGenerate}
            onClick={() => void generateFilm()}
          >
            {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            Genera Film
          </button>
          <button
            className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/8 px-5 font-semibold text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isGenerating || !canGenerate}
            onClick={applyFairTabletMode}
          >
            <TabletSmartphone className="h-5 w-5" />
            Genera video fiera
          </button>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="flex flex-col gap-5">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-lg p-4 sm:p-5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void addFiles(event.dataTransfer.files);
              }}
            >
              <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-white/20 bg-black/20 px-4 text-center transition hover:border-electric/70 hover:bg-blue-500/5">
                <ImagePlus className="mb-4 h-10 w-10 text-electric" />
                <span className="text-lg font-semibold">Trascina foto o seleziona file</span>
                <span className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                  JPG, PNG e HEIC fino a {MAX_IMAGES} immagini. L ordine viene inizialmente letto dai dati EXIF e puo essere modificato.
                </span>
                <input
                  className="hidden"
                  multiple
                  accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
                  type="file"
                  onChange={(event) => event.target.files && void addFiles(event.target.files)}
                />
              </label>
            </motion.div>

            <section className="glass rounded-lg p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Sequenza immagini</h2>
                  <p className="text-sm text-white/50">{selectedPhotos.length} selezionate su {photos.length}/{MAX_IMAGES}</p>
                </div>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button className="focus-ring h-9 rounded-md bg-white/8 px-3 text-xs font-medium hover:bg-white/14" onClick={() => setAllPhotoSelection(true)}>
                      Seleziona tutte
                    </button>
                    <button className="focus-ring h-9 rounded-md bg-white/8 px-3 text-xs font-medium hover:bg-white/14" onClick={() => setAllPhotoSelection(false)}>
                      Deseleziona tutte
                    </button>
                  </div>
                )}
              </div>
              <div className="grid max-h-[34rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
                {photos.map((photo, index) => (
                  <div key={photo.id} className={`rounded-lg border bg-white/[0.04] p-2 transition ${photo.selected ? 'border-white/10' : 'border-white/5 opacity-45'}`}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-black">
                      <img alt="" className="h-full w-full object-cover" src={photo.previewUrl} />
                      <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs">{index + 1}</span>
                      {!photo.selected && <span className="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-1 text-xs text-white/75">Esclusa</span>}
                    </div>
                    <div className="mt-2 min-w-0">
                      <p className="truncate text-sm font-medium">{photo.name}</p>
                      <p className="text-xs text-white/45">{photo.takenAt ? new Date(photo.takenAt).toLocaleDateString('it-IT') : formatSize(photo.size)}</p>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <button className="focus-ring grid h-8 place-items-center rounded bg-white/8 hover:bg-white/14" onClick={() => movePhoto(index, -1)} aria-label="Sposta su">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button className="focus-ring grid h-8 place-items-center rounded bg-white/8 hover:bg-white/14" onClick={() => movePhoto(index, 1)} aria-label="Sposta giu">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        className={`focus-ring grid h-8 place-items-center rounded text-xs font-semibold ${photo.selected ? 'bg-electric text-white hover:bg-blue-400' : 'bg-white/8 text-white/65 hover:bg-white/14'}`}
                        onClick={() => togglePhotoSelection(photo.id)}
                        aria-label={photo.selected ? 'Deseleziona foto' : 'Seleziona foto'}
                      >
                        Usa
                      </button>
                      <button className="focus-ring grid h-8 place-items-center rounded bg-red-500/15 text-red-100 hover:bg-red-500/25" onClick={() => removePhoto(photo.id)} aria-label="Rimuovi foto">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-5">
            <section className="glass rounded-lg p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">Descrivi l evento</h2>
              <textarea
                className="focus-ring min-h-32 w-full resize-none rounded-md border border-white/10 bg-black/30 p-3 text-sm leading-6 text-white placeholder:text-white/35"
                placeholder="Weekend in montagna con mia moglie e mia figlia. Relax, passeggiate e panorami."
                value={context}
                onChange={(event) => setContext(event.target.value)}
              />
            </section>

            <BrandKitPanel
              brandKits={brandKits}
              selectedBrandKit={selectedBrandKit}
              selectedBrandKitId={selectedBrandKitId}
              finalCta={finalCta}
              onSelect={(id) => {
                setSelectedBrandKitId(id);
                const kit = brandKits.find((item) => item.id === id);
                setFinalCta(kit?.ctas[0] ?? 'Visita il sito');
                setDownloadUrl(null);
                setRenderProgress(0);
              }}
              onCreate={createBrandKit}
              onDelete={deleteBrandKit}
              onExport={exportBrandKit}
              onImport={(file) => void importBrandKit(file)}
              onUpdate={updateSelectedBrandKit}
              onLogoUpload={(field, file) => void setBrandLogo(field, file)}
              onMusicUpload={(files) => void addBrandMusic(files)}
              onVideoUpload={(field, file) => void setBrandVideo(field, file)}
              onImagesUpload={(files) => void addInstitutionalImages(files)}
              onFinalCtaChange={(value) => {
                setFinalCta(value);
                setDownloadUrl(null);
                setRenderProgress(0);
              }}
            />

            <ImportContentPanel
              websiteUrl={websiteUrl}
              websiteImport={websiteImport}
              contentMode={contentMode}
              isImportingWebsite={isImportingWebsite}
              reviewQuery={reviewQuery}
              reviewMode={reviewMode}
              reviewsImport={reviewsImport}
              isImportingReviews={isImportingReviews}
              onWebsiteUrlChange={setWebsiteUrl}
              onContentModeChange={setContentMode}
              onImportWebsite={() => void importWebsiteContent()}
              onReviewQueryChange={setReviewQuery}
              onReviewModeChange={setReviewMode}
              onImportReviews={() => void importGoogleReviews()}
              onUpdateSlide={updateContentSlide}
              onAddSlide={addManualContentSlide}
            />

            <section className="glass rounded-lg p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">Preset professionali</h2>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className={`focus-ring rounded-md border px-3 py-2 text-left text-sm transition ${
                      template.id === templateId ? 'border-electric bg-blue-500/15 text-white' : 'border-white/10 bg-white/[0.04] text-white/65 hover:text-white'
                    }`}
                    onClick={() => {
                      setTemplateId(template.id);
                      setMusic((current) => ({ ...current, track: template.music }));
                      setPresetSettings(presetSettingsFromTemplate(template));
                    }}
                  >
                    <span className="block font-medium">{template.name}</span>
                    <span className="mt-1 block text-xs text-white/45">{template.editRhythm}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="glass rounded-lg p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">Personalizzazione preset</h2>
              <div className="grid gap-3">
                <SelectControl
                  label="Ritmo montaggio"
                  value={presetSettings.editRhythm}
                  options={[
                    'Lento emozionale',
                    'Lento premium',
                    'Medio morbido',
                    'Medio cinematografico',
                    'Medio preciso',
                    'Medio premium',
                    'Loop sostenuto',
                    'Veloce gioioso',
                    'Veloce highlights',
                    'Veloce epico'
                  ]}
                  onChange={(value) => setPresetSettings((current) => ({ ...current, editRhythm: value }))}
                />
                <SelectControl
                  label="Palette colori"
                  value={presetSettings.colorPalette}
                  options={[
                    'Warm Film',
                    'Teal Gold',
                    'Soft Ivory',
                    'Bright Pop',
                    'Pastel Clean',
                    'Graphite Blue',
                    'Studio Contrast',
                    'Expo Blue',
                    'High Contrast',
                    'Cinematic Steel'
                  ]}
                  onChange={(value) => setPresetSettings((current) => ({ ...current, colorPalette: value }))}
                />
                <SelectControl
                  label="Transizioni"
                  value={presetSettings.transitionStyle}
                  options={transitions}
                  onChange={(value) => setPresetSettings((current) => ({ ...current, transitionStyle: value }))}
                />
                <SelectControl
                  label="Stile testi"
                  value={presetSettings.textStyle}
                  options={[
                    'Fade Up elegante',
                    'Netflix Documentary',
                    'Letter Spacing Animation',
                    'Slide In giocoso',
                    'Typewriter soft',
                    'Keynote Minimal',
                    'Cinematic Reveal',
                    'Bold Booth Captions',
                    'Impact Titles',
                    'Netflix Action Reveal'
                  ]}
                  onChange={(value) => setPresetSettings((current) => ({ ...current, textStyle: value }))}
                />
                <label className="block text-sm text-white/65">
                  <span className="mb-1 flex justify-between">
                    Durata scene
                    <span>{presetSettings.sceneDuration.toFixed(1)}s</span>
                  </span>
                  <input
                    className="w-full accent-electric"
                    min={1.5}
                    max={7}
                    step={0.1}
                    type="range"
                    value={presetSettings.sceneDuration}
                    onChange={(event) => setPresetSettings((current) => ({ ...current, sceneDuration: Number(event.target.value) }))}
                  />
                </label>
                <label className="block text-sm text-white/65">
                  <span className="mb-1 block">Storyboard</span>
                  <textarea
                    className="focus-ring min-h-20 w-full resize-none rounded-md border border-white/10 bg-black/30 p-3 text-sm leading-5 text-white"
                    value={presetSettings.storyboardStyle}
                    onChange={(event) => setPresetSettings((current) => ({ ...current, storyboardStyle: event.target.value }))}
                  />
                </label>
              </div>
            </section>

            <section className="glass rounded-lg p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Music2 className="h-5 w-5 text-electric" />
                <h2 className="text-lg font-semibold">Musica AI</h2>
              </div>
              <select
                className="focus-ring mb-3 h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm"
                value={music.track}
                onChange={(event) => {
                  setMusic((current) => ({ ...current, track: event.target.value }));
                  setPresetSettings((current) => ({ ...current, musicType: event.target.value }));
                }}
              >
                <option>Auto AI Selection</option>
                {templates.map((template) => (
                  <option key={template.music}>{template.music}</option>
                ))}
              </select>
              {(['volume', 'fadeIn', 'fadeOut'] as const).map((field) => (
                <label key={field} className="mb-3 block text-sm text-white/65">
                  <span className="mb-1 flex justify-between">
                    {field === 'volume' ? 'Volume' : field === 'fadeIn' ? 'Fade in' : 'Fade out'}
                    <span>{music[field]}{field === 'volume' ? '%' : 's'}</span>
                  </span>
                  <input
                    className="w-full accent-electric"
                    min={field === 'volume' ? 0 : 0}
                    max={field === 'volume' ? 100 : 8}
                    type="range"
                    value={music[field]}
                    onChange={(event) => setMusic((current) => ({ ...current, [field]: Number(event.target.value) }))}
                  />
                </label>
              ))}
            </section>

            <section className="glass rounded-lg p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">Export</h2>
              <div className="mb-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <button
                  className={`focus-ring mb-3 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                    exportMode === 'fair-tablet' ? 'border-electric bg-blue-500/15 text-white' : 'border-white/10 bg-white/[0.04] text-white/70'
                  }`}
                  onClick={() => {
                    if (exportMode === 'fair-tablet') {
                      setExportMode('standard');
                      setTabletLoop(false);
                    } else {
                      applyFairTabletMode();
                    }
                    setDownloadUrl(null);
                    setRenderProgress(0);
                  }}
                >
                  <span>
                    <span className="block font-semibold">Export Fiera / Tablet</span>
                    <span className="mt-1 block text-xs text-white/45">60-90s, 16:9, 1080p, 30fps, alto contrasto</span>
                  </span>
                  <TabletSmartphone className="h-5 w-5 text-electric" />
                </button>
                <label className="flex items-center gap-3 text-sm text-white/70">
                  <input
                    className="h-4 w-4 accent-electric"
                    type="checkbox"
                    checked={tabletLoop}
                    onChange={(event) => {
                      setTabletLoop(event.target.checked);
                      if (event.target.checked) setExportMode('fair-tablet');
                      setDownloadUrl(null);
                    }}
                  />
                  Ottimizza per tablet in loop
                </label>
              </div>
              <label className="mb-3 block text-sm text-white/65">
                <span className="mb-1 block">Nome file</span>
                <input
                  className="focus-ring h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white"
                  value={filename}
                  onChange={(event) => {
                    setFilename(event.target.value);
                    setDownloadUrl(null);
                    setRenderProgress(0);
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['1080p', '4K'] as const).map((resolution) => (
                  <button
                    key={resolution}
                    disabled={exportMode === 'fair-tablet' && resolution === '4K'}
                    className={`focus-ring rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-35 ${exportSettings.resolution === resolution ? 'bg-electric' : 'bg-white/8'}`}
                    onClick={() => {
                      setExportSettings((current) => ({ ...current, resolution }));
                      setDownloadUrl(null);
                      setRenderProgress(0);
                    }}
                  >
                    MP4 {resolution}
                  </button>
                ))}
                {([30, 60] as const).map((fps) => (
                  <button
                    key={fps}
                    disabled={exportMode === 'fair-tablet' && fps === 60}
                    className={`focus-ring rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-35 ${exportSettings.fps === fps ? 'bg-electric' : 'bg-white/8'}`}
                    onClick={() => {
                      setExportSettings((current) => ({ ...current, fps }));
                      setDownloadUrl(null);
                      setRenderProgress(0);
                    }}
                  >
                    {fps} fps
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div id="preview-panel" className="glass rounded-lg p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Film className="h-5 w-5 text-electric" />
              <h2 className="text-lg font-semibold">Preview</h2>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.22),transparent_45%),radial-gradient(circle_at_70%_35%,rgba(255,255,255,0.12),transparent_18rem)]" />
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <p className="text-sm uppercase text-white/45">{selectedTemplate.name}</p>
                {selectedBrandKit ? <p className="text-xs uppercase text-white/45">{selectedBrandKit.identity.businessName || selectedBrandKit.name}</p> : null}
                <h3 className="mt-1 text-2xl font-semibold">{result?.plan.title ?? 'Il tuo film prende forma qui'}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                  {result?.plan.subtitle ?? `${presetSettings.editRhythm} / ${presetSettings.colorPalette} / ${presetSettings.textStyle}`}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="focus-ring grid h-10 w-10 place-items-center rounded-md bg-white/8 hover:bg-white/14" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? 'Pausa' : 'Play'}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-electric transition-all duration-700 ${isPlaying ? 'w-2/3' : 'w-1/3'}`} />
              </div>
              <button className="focus-ring grid h-10 w-10 place-items-center rounded-md bg-white/8 hover:bg-white/14" aria-label="Fullscreen">
                <Fullscreen className="h-5 w-5" />
              </button>
              {downloadUrl && (
                <a className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-black" href={downloadUrl} download={downloadName}>
                  <Download className="h-4 w-4" />
                  Scarica MP4
                </a>
              )}
            </div>
            {(isRendering || renderProgress > 0) && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-white/45">
                  <span>{renderPhaseMessage || (isRendering ? 'Generazione MP4 reale in corso' : 'Render completato')}</span>
                  <span>{renderProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-electric transition-all duration-500" style={{ width: `${renderProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="glass rounded-lg p-4 sm:p-5">
            <h2 className="mb-4 text-lg font-semibold">Regia automatica</h2>
            {error && <p className="mb-3 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
            <div className="grid gap-4 md:grid-cols-3">
              <InfoBlock title="AI Vision" items={['Persone', 'Bambini', 'Paesaggi', 'Animali', 'Sport', 'Sorrisi', 'Emozioni']} />
              <InfoBlock title="Preset attivo" items={[presetSettings.editRhythm, presetSettings.musicType, presetSettings.colorPalette, `${presetSettings.sceneDuration.toFixed(1)}s per scena`]} />
              <InfoBlock title="Stile video" items={[presetSettings.transitionStyle, presetSettings.textStyle, ...effects, ...cinematicEffects, ...animatedTexts]} />
            </div>

            {result && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/45">Modalita {result.mode === 'ai' ? 'OpenAI Vision + GPT' : 'Demo locale'}</p>
                    <h3 className="text-xl font-semibold">{result.plan.title}</h3>
                  </div>
                  <span className="rounded bg-blue-500/15 px-3 py-1 text-sm text-blue-100">{result.plan.detectedMood}</span>
                </div>
                <div className="grid gap-3">
                  <FinalExportReview
                    durationSeconds={exportMode === 'fair-tablet' ? 75 : Math.round(photos.length * presetSettings.sceneDuration + 2)}
                    photoCount={photos.length}
                    preset={selectedTemplate.name}
                    format={exportMode === 'fair-tablet' ? '16:9 1080p' : `16:9 ${exportSettings.resolution}`}
                    fps={exportMode === 'fair-tablet' ? 30 : exportSettings.fps}
                    title={result.plan.title}
                    subtitle={result.plan.subtitle}
                    cta={finalCta}
                    brandName={selectedBrandKit?.identity.businessName || selectedBrandKit?.name || 'Nessun Brand Kit'}
                    websiteImported={Boolean(websiteImport)}
                    serviceCount={websiteImport?.services.length ?? 0}
                    priceCount={websiteImport?.prices.length ?? 0}
                    offerCount={websiteImport?.offers.length ?? 0}
                    faqCount={websiteImport?.faqs.length ?? 0}
                    reviewCount={reviewsImport?.reviews.length ?? 0}
                    ratingAverage={reviewsImport?.ratingAverage ?? null}
                    totalGoogleReviews={reviewsImport?.reviewCount ?? null}
                    generatedCtas={[...(websiteImport?.slides ?? []), ...(reviewsImport?.slides ?? [])].filter((slide) => slide.kind === 'cta').map((slide) => slide.title)}
                    onTitleChange={(value) => updatePlan((plan) => ({ ...plan, title: exportMode === 'fair-tablet' ? limitWords(value, 5) : value }))}
                    onSubtitleChange={(value) => updatePlan((plan) => ({ ...plan, subtitle: exportMode === 'fair-tablet' ? limitWords(value, 5) : value }))}
                    onCtaChange={(value) => {
                      setFinalCta(exportMode === 'fair-tablet' ? limitWords(value, 5) : value);
                      setDownloadUrl(null);
                      setRenderProgress(0);
                    }}
                  />
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <button className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/8 px-3 text-sm hover:bg-white/14" onClick={regenerateTexts}>
                      <RefreshCcw className="h-4 w-4" />
                      Rigenera testi
                    </button>
                    <button className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/8 px-3 text-sm hover:bg-white/14" onClick={regenerateStoryboard}>
                      <Wand2 className="h-4 w-4" />
                      Rigenera storyboard
                    </button>
                    <button className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/8 px-3 text-sm hover:bg-white/14" onClick={quickPreview}>
                      <Eye className="h-4 w-4" />
                      Anteprima rapida
                    </button>
                    {!downloadUrl ? (
                      <button
                        className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-electric px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isRendering}
                        onClick={renderFilm}
                      >
                        {isRendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                        {exportMode === 'fair-tablet' ? 'Genera video fiera' : 'Renderizza MP4'}
                      </button>
                    ) : (
                      <a className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-black" href={downloadUrl} download={downloadName}>
                        <Download className="h-4 w-4" />
                        Scarica MP4
                      </a>
                    )}
                  </div>
                  {result.plan.chapters.map((chapter) => (
                    <article key={`${chapter.label}-${chapter.title}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-white/45">
                        <span>{chapter.label}</span>
                        <span>{chapter.effect} / {chapter.transition}</span>
                      </div>
                      <h4 className="font-semibold">{chapter.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-white/60">{chapter.text}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
                          value={chapter.title}
                          onChange={(event) =>
                            updatePlan((plan) => ({
                              ...plan,
                              chapters: plan.chapters.map((item, itemIndex) =>
                                itemIndex === result.plan.chapters.indexOf(chapter)
                                  ? { ...item, title: exportMode === 'fair-tablet' ? limitWords(event.target.value, 5) : event.target.value }
                                  : item
                              )
                            }))
                          }
                        />
                        <input
                          className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
                          value={chapter.text}
                          onChange={(event) =>
                            updatePlan((plan) => ({
                              ...plan,
                              chapters: plan.chapters.map((item, itemIndex) =>
                                itemIndex === result.plan.chapters.indexOf(chapter)
                                  ? { ...item, text: exportMode === 'fair-tablet' ? limitWords(event.target.value, 5) : event.target.value }
                                  : item
                              )
                            }))
                          }
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ImportContentPanel({
  websiteUrl,
  websiteImport,
  contentMode,
  isImportingWebsite,
  reviewQuery,
  reviewMode,
  reviewsImport,
  isImportingReviews,
  onWebsiteUrlChange,
  onContentModeChange,
  onImportWebsite,
  onReviewQueryChange,
  onReviewModeChange,
  onImportReviews,
  onUpdateSlide,
  onAddSlide
}: {
  websiteUrl: string;
  websiteImport: WebsiteImport | null;
  contentMode: 'photos' | 'photos-site' | 'site-only';
  isImportingWebsite: boolean;
  reviewQuery: string;
  reviewMode: string;
  reviewsImport: ReviewsImport | null;
  isImportingReviews: boolean;
  onWebsiteUrlChange: (value: string) => void;
  onContentModeChange: (value: 'photos' | 'photos-site' | 'site-only') => void;
  onImportWebsite: () => void;
  onReviewQueryChange: (value: string) => void;
  onReviewModeChange: (value: string) => void;
  onImportReviews: () => void;
  onUpdateSlide: (source: 'website' | 'google', id: string, patch: Partial<ContentSlide>) => void;
  onAddSlide: (source: 'website' | 'google') => void;
}) {
  return (
    <section className="glass rounded-lg p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-semibold">Website & Reviews Import</h2>

      <div className="mb-4 grid gap-2">
        <SelectControl
          label="Modalita utilizzo"
          value={contentMode}
          options={['photos', 'photos-site', 'site-only']}
          onChange={(value) => onContentModeChange(value as 'photos' | 'photos-site' | 'site-only')}
        />
        <input
          className="focus-ring h-10 rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white"
          placeholder="URL del sito web"
          value={websiteUrl}
          onChange={(event) => onWebsiteUrlChange(event.target.value)}
        />
        <button className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/8 px-3 text-sm hover:bg-white/14 disabled:opacity-50" disabled={isImportingWebsite || !websiteUrl} onClick={onImportWebsite}>
          {isImportingWebsite ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Importa contenuti sito
        </button>
      </div>

      {websiteImport ? (
        <div className="mb-5 rounded-lg border border-white/10 bg-black/20 p-3">
          <h3 className="mb-2 text-sm font-semibold">Contenuti estratti</h3>
          <ImportStats
            items={[
              `Servizi: ${websiteImport.services.length}`,
              `Prezzi: ${websiteImport.prices.length}`,
              `Offerte: ${websiteImport.offers.length}`,
              `FAQ: ${websiteImport.faqs.length}`,
              `CTA: ${websiteImport.slides.filter((slide) => slide.kind === 'cta').length}`
            ]}
          />
          <button className="focus-ring mt-3 h-9 rounded-md bg-white/8 px-3 text-sm hover:bg-white/14" onClick={() => onAddSlide('website')}>
            Aggiungi nuova slide
          </button>
          <EditableSlides slides={websiteImport.slides} source="website" onUpdate={onUpdateSlide} />
        </div>
      ) : null}

      <div className="mb-4 grid gap-2">
        <input
          className="focus-ring h-10 rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white"
          placeholder="Nome attivita o URL Google Business Profile"
          value={reviewQuery}
          onChange={(event) => onReviewQueryChange(event.target.value)}
        />
        <SelectControl
          label="Modalita recensioni"
          value={reviewMode}
          options={['rating-only', 'rating-count', 'selected-reviews', 'ai-summary', 'all']}
          onChange={onReviewModeChange}
        />
        <button className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white/8 px-3 text-sm hover:bg-white/14 disabled:opacity-50" disabled={isImportingReviews || !reviewQuery} onClick={onImportReviews}>
          {isImportingReviews ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Importa recensioni Google
        </button>
      </div>

      {reviewsImport ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <h3 className="mb-2 text-sm font-semibold">Recensioni selezionate</h3>
          <ImportStats
            items={[
              `Valutazione: ${reviewsImport.ratingAverage ?? '-'}`,
              `Recensioni: ${reviewsImport.reviewCount ?? '-'}`,
              `Temi: ${reviewsImport.themes.join(', ') || '-'}`
            ]}
          />
          <button className="focus-ring mt-3 h-9 rounded-md bg-white/8 px-3 text-sm hover:bg-white/14" onClick={() => onAddSlide('google')}>
            Aggiungi recensione/slide
          </button>
          <EditableSlides slides={reviewsImport.slides} source="google" onUpdate={onUpdateSlide} />
        </div>
      ) : null}
    </section>
  );
}

function ImportStats({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded bg-white/8 px-2 py-1 text-xs text-white/55">
          {item}
        </span>
      ))}
    </div>
  );
}

function EditableSlides({
  slides,
  source,
  onUpdate
}: {
  slides: ContentSlide[];
  source: 'website' | 'google';
  onUpdate: (source: 'website' | 'google', id: string, patch: Partial<ContentSlide>) => void;
}) {
  return (
    <div className="mt-3 grid gap-2">
      {slides.map((slide) => (
        <article key={slide.id} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
          <label className="mb-2 flex items-center gap-2 text-xs text-white/55">
            <input className="accent-electric" type="checkbox" checked={slide.approved} onChange={(event) => onUpdate(source, slide.id, { approved: event.target.checked })} />
            Approvata / {slide.kind}
          </label>
          <div className="grid gap-2">
            <input className="focus-ring h-8 rounded border border-white/10 bg-black/30 px-2 text-sm" value={slide.title} onChange={(event) => onUpdate(source, slide.id, { title: event.target.value })} />
            <input className="focus-ring h-8 rounded border border-white/10 bg-black/30 px-2 text-sm" value={slide.subtitle} onChange={(event) => onUpdate(source, slide.id, { subtitle: event.target.value })} />
            <input className="focus-ring h-8 rounded border border-white/10 bg-black/30 px-2 text-sm" value={slide.caption} onChange={(event) => onUpdate(source, slide.id, { caption: event.target.value })} />
          </div>
        </article>
      ))}
    </div>
  );
}

function BrandKitPanel({
  brandKits,
  selectedBrandKit,
  selectedBrandKitId,
  finalCta,
  onSelect,
  onCreate,
  onDelete,
  onExport,
  onImport,
  onUpdate,
  onLogoUpload,
  onMusicUpload,
  onVideoUpload,
  onImagesUpload,
  onFinalCtaChange
}: {
  brandKits: BrandKit[];
  selectedBrandKit: BrandKit | null;
  selectedBrandKitId: string;
  finalCta: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onUpdate: (updater: (kit: BrandKit) => BrandKit) => void;
  onLogoUpload: (field: keyof BrandKit['logos'], file: File) => void;
  onMusicUpload: (files: FileList | null) => void;
  onVideoUpload: (field: 'introVideo' | 'outroVideo', file: File) => void;
  onImagesUpload: (files: FileList | null) => void;
  onFinalCtaChange: (value: string) => void;
}) {
  if (!selectedBrandKit) {
    return (
      <section className="glass rounded-lg p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Brand Kit</h2>
        <button className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-electric px-3 text-sm font-semibold" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Crea Brand Kit
        </button>
      </section>
    );
  }

  const identityFields: Array<[keyof BrandKit['identity'], string]> = [
    ['businessName', 'Nome attivita'],
    ['slogan', 'Slogan'],
    ['description', 'Descrizione breve'],
    ['industry', 'Settore'],
    ['website', 'Sito web'],
    ['email', 'Email'],
    ['phone', 'Telefono'],
    ['qrUrl', 'URL principale QR Code']
  ];
  const logoFields: Array<[keyof BrandKit['logos'], string]> = [
    ['main', 'Logo principale'],
    ['white', 'Logo bianco'],
    ['transparent', 'Logo trasparente'],
    ['favicon', 'Favicon']
  ];
  const colorFields: Array<[keyof BrandKit['colors'], string]> = [
    ['primary', 'Colore principale'],
    ['secondary', 'Colore secondario'],
    ['cta', 'Colore CTA'],
    ['background', 'Colore sfondo'],
    ['text', 'Colore testi']
  ];
  const typographyFields: Array<[keyof BrandKit['typography'], string]> = [
    ['titleFont', 'Font titoli'],
    ['subtitleFont', 'Font sottotitoli'],
    ['bodyFont', 'Font corpo testo']
  ];
  const socialFields: Array<[keyof BrandKit['social'], string]> = [
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['linkedin', 'LinkedIn']
  ];

  return (
    <section className="glass rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Brand Kit</h2>
        <div className="flex gap-2">
          <button className="focus-ring grid h-9 w-9 place-items-center rounded-md bg-white/8 hover:bg-white/14" onClick={onCreate} aria-label="Nuovo Brand Kit">
            <Plus className="h-4 w-4" />
          </button>
          <button className="focus-ring grid h-9 w-9 place-items-center rounded-md bg-white/8 hover:bg-white/14" onClick={onExport} aria-label="Esporta Brand Kit">
            <FileDown className="h-4 w-4" />
          </button>
          <label className="focus-ring grid h-9 w-9 cursor-pointer place-items-center rounded-md bg-white/8 hover:bg-white/14" aria-label="Importa Brand Kit">
            <FileUp className="h-4 w-4" />
            <input className="hidden" type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} />
          </label>
          <button className="focus-ring grid h-9 w-9 place-items-center rounded-md bg-red-500/15 text-red-100 hover:bg-red-500/25" onClick={onDelete} aria-label="Elimina Brand Kit">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <label className="mb-3 block text-sm text-white/65">
        Seleziona Brand Kit
        <select className="focus-ring mt-1 h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white" value={selectedBrandKitId} onChange={(event) => onSelect(event.target.value)}>
          {brandKits.map((kit) => (
            <option key={kit.id} value={kit.id}>
              {kit.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4 rounded-lg border border-white/10 p-3" style={{ background: selectedBrandKit.colors.background, color: selectedBrandKit.colors.text }}>
        <div className="flex items-center gap-3">
          {selectedBrandKit.logos.main ? <img alt="" className="h-12 w-24 object-contain" src={selectedBrandKit.logos.main} /> : <div className="grid h-12 w-24 place-items-center rounded bg-white/10 text-xs">Logo</div>}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ fontFamily: selectedBrandKit.typography.titleFont }}>{selectedBrandKit.identity.businessName || selectedBrandKit.name}</p>
            <p className="truncate text-xs opacity-75" style={{ fontFamily: selectedBrandKit.typography.subtitleFont }}>{selectedBrandKit.identity.slogan || 'Anteprima Brand Kit'}</p>
          </div>
        </div>
        <div className="mt-3 inline-flex rounded px-3 py-1 text-xs font-semibold" style={{ background: selectedBrandKit.colors.cta, color: selectedBrandKit.colors.text }}>
          {finalCta}
        </div>
      </div>

      <BrandGroup title="Identita">
        <input
          className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
          value={selectedBrandKit.name}
          onChange={(event) => onUpdate((kit) => ({ ...kit, name: event.target.value }))}
          placeholder="Nome Brand Kit"
        />
        {identityFields.map(([field, label]) => (
          <input
            key={field}
            className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
            value={selectedBrandKit.identity[field]}
            onChange={(event) => onUpdate((kit) => ({ ...kit, identity: { ...kit.identity, [field]: event.target.value } }))}
            placeholder={label}
          />
        ))}
      </BrandGroup>

      <BrandGroup title="Loghi">
        {logoFields.map(([field, label]) => (
          <label key={field} className="flex h-9 cursor-pointer items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white/65">
            {label}
            <Save className="h-4 w-4" />
            <input className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onLogoUpload(field, event.target.files[0])} />
          </label>
        ))}
      </BrandGroup>

      <BrandGroup title="Colori">
        {colorFields.map(([field, label]) => (
          <label key={field} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/65">
            {label}
            <input className="h-7 w-10 cursor-pointer border-0 bg-transparent" type="color" value={selectedBrandKit.colors[field]} onChange={(event) => onUpdate((kit) => ({ ...kit, colors: { ...kit.colors, [field]: event.target.value } }))} />
          </label>
        ))}
      </BrandGroup>

      <BrandGroup title="Tipografia">
        {typographyFields.map(([field, label]) => (
          <select
            key={field}
            className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
            value={selectedBrandKit.typography[field]}
            onChange={(event) => onUpdate((kit) => ({ ...kit, typography: { ...kit.typography, [field]: event.target.value } }))}
          >
            {[label, 'Inter', 'Montserrat', 'Poppins', 'Arial', 'Georgia'].map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
        ))}
      </BrandGroup>

      <BrandGroup title="Social">
        {socialFields.map(([field, label]) => (
          <input
            key={field}
            className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
            value={selectedBrandKit.social[field]}
            onChange={(event) => onUpdate((kit) => ({ ...kit, social: { ...kit.social, [field]: event.target.value } }))}
            placeholder={label}
          />
        ))}
      </BrandGroup>

      <BrandGroup title="Call to action">
        <select className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white" value={finalCta} onChange={(event) => onFinalCtaChange(event.target.value)}>
          {selectedBrandKit.ctas.map((cta) => (
            <option key={cta}>{cta}</option>
          ))}
        </select>
        <input
          className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
          placeholder="Aggiungi CTA"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.currentTarget.value.trim()) {
              const value = event.currentTarget.value.trim();
              onUpdate((kit) => ({ ...kit, ctas: [...kit.ctas, value] }));
              onFinalCtaChange(value);
              event.currentTarget.value = '';
            }
          }}
        />
      </BrandGroup>

      <BrandGroup title="QR Code">
        <select
          className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
          value={selectedBrandKit.qrCode?.mode ?? 'final'}
          onChange={(event) => onUpdate((kit) => ({ ...kit, qrCode: { ...(kit.qrCode ?? { label: 'Scansiona il QR Code' }), mode: event.target.value as BrandKit['qrCode']['mode'] } }))}
        >
          <option value="final">Mostra QR Code nel finale</option>
          <option value="cta">Mostra QR Code nelle slide CTA</option>
          <option value="always">Mostra QR Code sempre piccolo in basso</option>
          <option value="none">Non mostrare QR Code</option>
        </select>
        <input
          className="focus-ring h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
          value={selectedBrandKit.qrCode?.label ?? 'Scansiona il QR Code'}
          onChange={(event) => onUpdate((kit) => ({ ...kit, qrCode: { ...(kit.qrCode ?? { mode: 'final' }), label: event.target.value } }))}
          placeholder="Testo QR Code"
        />
      </BrandGroup>

      <BrandGroup title="Asset multimediali">
        <label className="flex h-9 cursor-pointer items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white/65">
          Musiche preferite ({selectedBrandKit.assets.music.length})
          <input className="hidden" multiple type="file" accept="audio/*" onChange={(event) => onMusicUpload(event.target.files)} />
        </label>
        <label className="flex h-9 cursor-pointer items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white/65">
          Video intro
          <input className="hidden" type="file" accept="video/*" onChange={(event) => event.target.files?.[0] && onVideoUpload('introVideo', event.target.files[0])} />
        </label>
        <label className="flex h-9 cursor-pointer items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white/65">
          Video outro
          <input className="hidden" type="file" accept="video/*" onChange={(event) => event.target.files?.[0] && onVideoUpload('outroVideo', event.target.files[0])} />
        </label>
        <label className="flex h-9 cursor-pointer items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white/65">
          Immagini istituzionali ({selectedBrandKit.assets.institutionalImages.length})
          <input className="hidden" multiple type="file" accept="image/*" onChange={(event) => onImagesUpload(event.target.files)} />
        </label>
      </BrandGroup>
    </section>
  );
}

function BrandGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase text-white/45">{title}</h3>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm text-white/65">
      <span className="mb-1 block">{label}</span>
      <select className="focus-ring h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 text-sm text-white" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function FinalExportReview({
  durationSeconds,
  photoCount,
  preset,
  format,
  fps,
  title,
  subtitle,
  cta,
  brandName,
  websiteImported,
  serviceCount,
  priceCount,
  offerCount,
  faqCount,
  reviewCount,
  ratingAverage,
  totalGoogleReviews,
  generatedCtas,
  onTitleChange,
  onSubtitleChange,
  onCtaChange
}: {
  durationSeconds: number;
  photoCount: number;
  preset: string;
  format: string;
  fps: number;
  title: string;
  subtitle: string;
  cta: string;
  brandName: string;
  websiteImported: boolean;
  serviceCount: number;
  priceCount: number;
  offerCount: number;
  faqCount: number;
  reviewCount: number;
  ratingAverage: number | null;
  totalGoogleReviews: number | null;
  generatedCtas: string[];
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onCtaChange: (value: string) => void;
}) {
  return (
    <section className="rounded-lg border border-electric/25 bg-blue-500/10 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">Controllo finale export</h3>
        <span className="rounded bg-black/30 px-2 py-1 text-xs text-blue-100">{durationSeconds}s stimati</span>
      </div>
      <div className="mb-3 grid gap-2 text-xs text-white/60 sm:grid-cols-4">
        <span>Foto: {photoCount}</span>
        <span>Preset: {preset}</span>
        <span>Formato: {format}</span>
        <span>FPS: {fps}</span>
        <span>Brand: {brandName}</span>
        <span>Sito: {websiteImported ? 'importato' : 'no'}</span>
        <span>Servizi: {serviceCount}</span>
        <span>Prezzi: {priceCount}</span>
        <span>Offerte: {offerCount}</span>
        <span>FAQ: {faqCount}</span>
        <span>Recensioni: {reviewCount}</span>
        <span>Rating: {ratingAverage ?? '-'}</span>
        <span>Totale Google: {totalGoogleReviews ?? '-'}</span>
      </div>
      {generatedCtas.length > 0 ? <p className="mb-3 text-xs text-white/55">CTA generate: {generatedCtas.join(', ')}</p> : null}
      <div className="grid gap-2 md:grid-cols-3">
        <label className="block text-xs text-white/55">
          Testo principale
          <input className="focus-ring mt-1 h-9 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white" value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </label>
        <label className="block text-xs text-white/55">
          Sottotitolo
          <input className="focus-ring mt-1 h-9 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white" value={subtitle} onChange={(event) => onSubtitleChange(event.target.value)} />
        </label>
        <label className="block text-xs text-white/55">
          CTA finale
          <input className="focus-ring mt-1 h-9 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white" value={cta} onChange={(event) => onCtaChange(event.target.value)} />
        </label>
      </div>
    </section>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <h3 className="mb-2 text-sm font-semibold text-white/80">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 10).map((item) => (
          <span key={item} className="rounded bg-white/8 px-2 py-1 text-xs text-white/55">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
