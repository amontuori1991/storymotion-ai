import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import type { RemotionRenderProps } from '../lib/render-types';

const palettes: Record<string, { bg: string; accent: string; tint: string; text: string }> = {
  'Warm Film': { bg: '#130f0b', accent: '#f5b971', tint: 'rgba(245, 185, 113, 0.18)', text: '#fff8ef' },
  'Teal Gold': { bg: '#071312', accent: '#d8b45f', tint: 'rgba(34, 211, 238, 0.16)', text: '#f8fafc' },
  'Soft Ivory': { bg: '#11100e', accent: '#f7d7bd', tint: 'rgba(247, 215, 189, 0.18)', text: '#fffaf4' },
  'Bright Pop': { bg: '#100b18', accent: '#60a5fa', tint: 'rgba(244, 114, 182, 0.18)', text: '#ffffff' },
  'Pastel Clean': { bg: '#0d1214', accent: '#a7f3d0', tint: 'rgba(167, 243, 208, 0.16)', text: '#f8fafc' },
  'Graphite Blue': { bg: '#0a0a0a', accent: '#3b82f6', tint: 'rgba(59, 130, 246, 0.18)', text: '#ffffff' },
  'Studio Contrast': { bg: '#080808', accent: '#ffffff', tint: 'rgba(255, 255, 255, 0.12)', text: '#ffffff' },
  'Expo Blue': { bg: '#07111f', accent: '#38bdf8', tint: 'rgba(56, 189, 248, 0.18)', text: '#ffffff' },
  'High Contrast': { bg: '#050505', accent: '#facc15', tint: 'rgba(250, 204, 21, 0.16)', text: '#ffffff' },
  'Cinematic Steel': { bg: '#090b0f', accent: '#93c5fd', tint: 'rgba(147, 197, 253, 0.16)', text: '#ffffff' }
};

function brandPalette(fallback: { bg: string; accent: string; tint: string; text: string }, brandKit: RemotionRenderProps['brandKit']) {
  if (!brandKit) return fallback;
  return {
    bg: brandKit.colors.background || fallback.bg,
    accent: brandKit.colors.cta || brandKit.colors.primary || fallback.accent,
    tint: `${brandKit.colors.primary || fallback.accent}2b`,
    text: brandKit.colors.text || fallback.text
  };
}

function getTextAnimation(style: string, frame: number, fps: number) {
  if (style.includes('Slide')) {
    return {
      opacity: interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      transform: `translateX(${interpolate(frame, [6, 24], [-90, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`
    };
  }

  if (style.includes('Reveal') || style.includes('Netflix')) {
    const reveal = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 90 } });
    return {
      opacity: reveal,
      transform: `translateY(${(1 - reveal) * 42}px) scale(${0.98 + reveal * 0.02})`,
      clipPath: `inset(0 ${Math.max(0, 100 - reveal * 100)}% 0 0)`
    };
  }

  return {
    opacity: interpolate(frame, [8, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    transform: `translateY(${interpolate(frame, [8, 24], [38, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`
  };
}

function typewriterText(text: string, enabled: boolean, frame: number) {
  if (!enabled) return text;
  const visible = Math.max(0, Math.min(text.length, Math.floor((frame - 12) / 2)));
  return text.slice(0, visible);
}

function trimWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ');
}

function transitionStyle(type: string, localFrame: number, sceneFrames: number, index: number) {
  const fadeIn = interpolate(localFrame, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(localFrame, [sceneFrames - 18, sceneFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const edge = Math.min(fadeIn, fadeOut);
  const blur = interpolate(edge, [0, 1], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  if (type.includes('Swipe')) {
    const x = interpolate(localFrame, [0, 24], [index % 2 === 0 ? 80 : -80, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return { opacity: edge, transform: `translateX(${x}px)`, filter: `blur(${blur}px)` };
  }

  if (type.includes('Zoom')) {
    const scale = interpolate(localFrame, [0, 24], [1.08, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return { opacity: edge, transform: `scale(${scale})`, filter: `blur(${blur}px)` };
  }

  if (type.includes('Blur')) {
    return { opacity: edge, filter: `blur(${blur * 1.5}px)` };
  }

  return { opacity: edge, filter: `blur(${blur}px)` };
}

function Scene({
  src,
  title,
  subtitle,
  caption,
  index,
  sceneFrames,
  palette,
  transition,
  textStyle,
  isFairMode,
  brandKit
}: {
  src: string;
  title: string;
  subtitle: string;
  caption: string;
  index: number;
  sceneFrames: number;
  palette: { bg: string; accent: string; tint: string; text: string };
  transition: string;
  textStyle: string;
  isFairMode: boolean;
  brandKit: RemotionRenderProps['brandKit'];
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame;
  const progress = local / sceneFrames;
  const zoomIn = index % 2 === 0;
  const scale = zoomIn ? 1.05 + progress * 0.1 : 1.15 - progress * 0.08;
  const pan = interpolate(progress, [0, 1], index % 2 === 0 ? [-34, 34] : [34, -34]);
  const textMotion = getTextAnimation(textStyle, local, fps);
  const typewriter = textStyle.toLowerCase().includes('typewriter');
  const flash = transition.includes('Flash')
    ? interpolate(Math.min(local, sceneFrames - local), [0, 8, 18], [0.65, 0.22, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp'
      })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, overflow: 'hidden', ...transitionStyle(transition, local, sceneFrames, index) }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${pan}px)`,
          filter: isFairMode ? 'contrast(1.18) saturate(1.08)' : 'contrast(1.06) saturate(1.08)',
          transformOrigin: index % 2 === 0 ? '45% 50%' : '55% 50%'
        }}
      />
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(90deg, rgba(0,0,0,${isFairMode ? 0.88 : 0.76}) 0%, rgba(0,0,0,0.34) 45%, rgba(0,0,0,0.16) 100%), ` +
            `radial-gradient(circle at ${index % 2 === 0 ? '78% 18%' : '22% 18%'}, ${palette.tint}, transparent 28%)`
        }}
      />
      <AbsoluteFill style={{ background: `rgba(255,255,255,${flash})` }} />
      <div
        style={{
          position: 'absolute',
          left: isFairMode ? 118 : 96,
          right: isFairMode ? 118 : 96,
          bottom: isFairMode ? 118 : 86,
          color: palette.text,
          ...textMotion
        }}
      >
        {brandKit?.logos.white || brandKit?.logos.transparent || brandKit?.logos.main ? (
          <Img
            src={brandKit.logos.white || brandKit.logos.transparent || brandKit.logos.main}
            style={{ width: isFairMode ? 210 : 150, height: 72, objectFit: 'contain', objectPosition: 'left center', marginBottom: 22 }}
          />
        ) : null}
        <div style={{ width: isFairMode ? 130 : 92, height: isFairMode ? 5 : 3, background: palette.accent, marginBottom: 24 }} />
        <div style={{ fontFamily: brandKit?.typography.titleFont || 'Inter, Arial, sans-serif', fontSize: isFairMode ? 92 : 62, lineHeight: 1, fontWeight: 800, maxWidth: 1250 }}>{title}</div>
        <div style={{ fontFamily: brandKit?.typography.subtitleFont || 'Inter, Arial, sans-serif', marginTop: 20, fontSize: isFairMode ? 44 : 30, lineHeight: 1.18, color: 'rgba(255,255,255,0.9)', maxWidth: 1120 }}>{subtitle}</div>
        <div style={{ fontFamily: brandKit?.typography.bodyFont || 'Inter, Arial, sans-serif', marginTop: 24, fontSize: isFairMode ? 32 : 22, lineHeight: 1.25, color: 'rgba(255,255,255,0.76)', maxWidth: 980 }}>
          {typewriterText(caption, typewriter, local)}
        </div>
        {brandKit?.identity.website ? <div style={{ marginTop: 28, fontSize: isFairMode ? 30 : 18, color: palette.accent }}>{brandKit.identity.website}</div> : null}
      </div>
    </AbsoluteFill>
  );
}

function InfoSlide({
  title,
  subtitle,
  caption,
  rating,
  palette,
  brandKit,
  isFairMode,
  qrCodeDataUrl,
  showQr
}: {
  title: string;
  subtitle: string;
  caption: string;
  rating?: number;
  palette: { bg: string; accent: string; tint: string; text: string };
  brandKit: RemotionRenderProps['brandKit'];
  isFairMode: boolean;
  qrCodeDataUrl: string;
  showQr: boolean;
}) {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: palette.bg, justifyContent: 'center', padding: isFairMode ? 116 : 92, color: palette.text, opacity: reveal }}>
      {brandKit?.logos.white || brandKit?.logos.main ? <Img src={brandKit.logos.white || brandKit.logos.main} style={{ width: 210, height: 78, objectFit: 'contain', objectPosition: 'left center', marginBottom: 34 }} /> : null}
      <div style={{ width: 140, height: 5, background: palette.accent, marginBottom: 30 }} />
      {rating ? <div style={{ color: palette.accent, fontSize: isFairMode ? 58 : 42, marginBottom: 20 }}>★★★★★</div> : null}
      <div style={{ fontFamily: brandKit?.typography.titleFont || 'Inter, Arial, sans-serif', fontSize: isFairMode ? 96 : 72, lineHeight: 1, fontWeight: 850, maxWidth: 1300 }}>{title}</div>
      <div style={{ fontFamily: brandKit?.typography.subtitleFont || 'Inter, Arial, sans-serif', marginTop: 24, fontSize: isFairMode ? 48 : 36, color: 'rgba(255,255,255,0.86)', maxWidth: 1120 }}>{subtitle}</div>
      <div style={{ fontFamily: brandKit?.typography.bodyFont || 'Inter, Arial, sans-serif', marginTop: 24, fontSize: isFairMode ? 34 : 26, color: 'rgba(255,255,255,0.7)', maxWidth: 980 }}>{caption}</div>
      {showQr && qrCodeDataUrl ? (
        <div style={{ position: 'absolute', right: 110, bottom: 110, textAlign: 'center' }}>
          <Img src={qrCodeDataUrl} style={{ width: 240, height: 240, backgroundColor: '#fff', padding: 10 }} />
          <div style={{ marginTop: 14, fontSize: 26, color: palette.text }}>{brandKit?.qrCode?.label || 'Scansiona il QR Code'}</div>
        </div>
      ) : null}
      {brandKit?.identity.website ? <div style={{ marginTop: 40, color: palette.accent, fontSize: 28 }}>{brandKit.identity.website}</div> : null}
    </AbsoluteFill>
  );
}

export const StoryMotionVideo = ({ images, plan, templateName, music, presetSettings, exportMode, finalCta, brandKit, contentSlides, qrCodeDataUrl, audioDataUrl }: RemotionRenderProps) => {
  const { fps, durationInFrames } = useVideoConfig();
  const isFairMode = exportMode === 'fair-tablet';
  const finalFrames = isFairMode ? Math.min(Math.round(5 * fps), Math.round(durationInFrames * 0.08)) : 0;
  const visualFrames = Math.max(fps, durationInFrames - finalFrames);
  const palette = brandPalette(palettes[isFairMode ? 'High Contrast' : presetSettings.colorPalette] ?? palettes['Graphite Blue'], brandKit);
  const sceneFrames = isFairMode
    ? Math.max(45, Math.round((presetSettings.sceneDuration || 2.4) * fps))
    : Math.max(45, Math.round((presetSettings.sceneDuration || 4) * fps));
  const sourceScenes = images;
  const approvedSlides = contentSlides.filter((slide) => slide.approved);
  const visualSlots = isFairMode ? Math.ceil(visualFrames / sceneFrames) : Math.max(1, sourceScenes.length + approvedSlides.length);
  const slots = Array.from({ length: visualSlots }, (_, index) => {
    if (approvedSlides.length > 0 && (index % 2 === 1 || sourceScenes.length === 0)) {
      return { type: 'content' as const, slide: approvedSlides[Math.floor(index / 2) % approvedSlides.length] };
    }
    if (sourceScenes.length > 0) return { type: 'photo' as const, image: sourceScenes[Math.floor(index / 2) % sourceScenes.length] };
    return approvedSlides.length > 0 ? { type: 'content' as const, slide: approvedSlides[index % approvedSlides.length] } : null;
  }).filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  const audioVolume = (frame: number) => {
    const base = Math.max(0, Math.min(1, music.volume / 100));
    const fadeInFrames = Math.max(1, Math.round(music.fadeIn * fps));
    const fadeOutFrames = Math.max(1, Math.round(music.fadeOut * fps));
    const inGain = interpolate(frame, [0, fadeInFrames], [0, base], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const outGain = interpolate(frame, [durationInFrames - fadeOutFrames, durationInFrames], [base, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    });
    return Math.min(inGain, outGain);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, fontFamily: 'Inter, Arial, sans-serif' }}>
      {audioDataUrl ? <Audio src={audioDataUrl} loop volume={audioVolume} /> : null}
      {slots.map((slot, index) => {
        const chapter = plan.chapters[index % Math.max(1, plan.chapters.length)];
        const detected = plan.scenes[index % Math.max(1, plan.scenes.length)];
        const title = trimWords(index === 0 ? plan.title : chapter?.title ?? templateName, isFairMode ? 5 : 14);
        const subtitle = trimWords(index === 0 ? plan.subtitle : chapter?.text ?? presetSettings.storyboardStyle, isFairMode ? 5 : 22);
        const caption = trimWords(detected?.summary ?? plan.timeline[index % Math.max(1, plan.timeline.length)] ?? presetSettings.storyboardStyle, isFairMode ? 5 : 28);

        if (slot.type === 'content') {
          return (
            <Sequence key={`${slot.slide.id}-${index}`} from={index * sceneFrames} durationInFrames={sceneFrames + 8}>
              <InfoSlide
                title={trimWords(slot.slide.title, isFairMode ? 5 : 10)}
                subtitle={trimWords(slot.slide.subtitle, isFairMode ? 5 : 14)}
                caption={trimWords(slot.slide.caption, isFairMode ? 8 : 22)}
                rating={slot.slide.rating}
                palette={palette}
                brandKit={brandKit}
                isFairMode={isFairMode}
                qrCodeDataUrl={qrCodeDataUrl}
                showQr={Boolean(qrCodeDataUrl && brandKit?.qrCode?.mode === 'cta' && slot.slide.kind === 'cta')}
              />
            </Sequence>
          );
        }

        return (
          <Sequence key={`${slot.image.name}-${index}`} from={index * sceneFrames} durationInFrames={sceneFrames + 8}>
            <Scene
              src={slot.image.dataUrl}
              title={title}
              subtitle={subtitle}
              caption={caption}
              index={index}
              sceneFrames={sceneFrames}
              palette={palette}
              transition={presetSettings.transitionStyle}
              textStyle={presetSettings.textStyle}
              isFairMode={isFairMode}
              brandKit={brandKit}
            />
          </Sequence>
        );
      })}
      {isFairMode || brandKit ? (
        <Sequence from={Math.max(0, durationInFrames - (finalFrames || Math.round(5 * fps)))} durationInFrames={finalFrames || Math.round(5 * fps)}>
          <AbsoluteFill style={{ backgroundColor: palette.bg, justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ color: palette.text, textAlign: 'center', padding: 96 }}>
              {brandKit?.logos.white || brandKit?.logos.main ? <Img src={brandKit.logos.white || brandKit.logos.main} style={{ width: 260, height: 110, objectFit: 'contain', margin: '0 auto 36px' }} /> : null}
              <div style={{ fontSize: 44, textTransform: 'uppercase', color: palette.accent, letterSpacing: 4, marginBottom: 28 }}>{brandKit?.identity.businessName || 'Scopri di piu'}</div>
              <div style={{ fontFamily: brandKit?.typography.titleFont || 'Inter, Arial, sans-serif', fontSize: 118, lineHeight: 1, fontWeight: 850 }}>{trimWords(finalCta || brandKit?.ctas[0] || 'Visita lo stand', 5)}</div>
              {qrCodeDataUrl && (brandKit?.qrCode?.mode === 'final' || brandKit?.qrCode?.mode === 'always') ? (
                <div style={{ marginTop: 42 }}>
                  <Img src={qrCodeDataUrl} style={{ width: 260, height: 260, backgroundColor: '#fff', padding: 12, margin: '0 auto' }} />
                  <div style={{ marginTop: 18, fontSize: 34, color: palette.accent }}>{brandKit?.qrCode?.label || 'Scansiona il QR Code'}</div>
                </div>
              ) : null}
              <div style={{ marginTop: 34, fontSize: 32, color: 'rgba(255,255,255,0.78)' }}>
                {[brandKit?.identity.website, brandKit?.identity.email, brandKit?.identity.phone].filter(Boolean).join('   |   ')}
              </div>
              <div style={{ width: 260, height: 6, background: palette.accent, margin: '42px auto 0' }} />
            </div>
          </AbsoluteFill>
        </Sequence>
      ) : null}
      {qrCodeDataUrl && brandKit?.qrCode?.mode === 'always' ? (
        <div style={{ position: 'absolute', right: 38, bottom: 38, backgroundColor: '#fff', padding: 8 }}>
          <Img src={qrCodeDataUrl} style={{ width: 150, height: 150 }} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
