import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ContentSlide, WebsiteImport } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

const schema = z.object({
  url: z.string().url()
});

const paths = ['', '/', '/servizi', '/services', '/prezzi', '/prices', '/contatti', '/contact', '/chi-siamo', '/about', '/faq', '/offerte', '/promo'];

function textFromHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchAll(text: string, regex: RegExp) {
  return Array.from(text.matchAll(regex)).map((match) => match[0].trim());
}

function unique(items: string[], max = 8) {
  return Array.from(new Set(items.map((item) => item.trim()).filter((item) => item.length > 2))).slice(0, max);
}

function slide(kind: ContentSlide['kind'], title: string, subtitle = '', caption = ''): ContentSlide {
  return {
    id: crypto.randomUUID(),
    kind,
    title,
    subtitle,
    caption,
    approved: true,
    source: 'website'
  };
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'URL non valido' }, { status: 400 });

  const base = new URL(parsed.data.url);
  const pages: string[] = [];

  for (const candidate of paths) {
    try {
      const url = new URL(candidate, base.origin);
      const response = await fetch(url, { headers: { 'User-Agent': 'StoryMotionAI/1.0' }, signal: AbortSignal.timeout(8000) });
      if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
        pages.push(await response.text());
      }
    } catch {
      // Skip unreachable pages.
    }
  }

  if (pages.length === 0) {
    return NextResponse.json({ error: 'Nessun contenuto leggibile trovato sul sito.' }, { status: 422 });
  }

  const html = pages.join('\n');
  const text = textFromHtml(html);
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || base.hostname.replace(/^www\./, '');
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || text.slice(0, 180);
  const emails = unique(matchAll(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi), 4);
  const phones = unique(matchAll(text, /(?:\+?\d[\d\s().-]{7,}\d)/g), 4);
  const prices = unique(matchAll(text, /(?:€|\bEUR\b)\s?\d+(?:[,.]\d{1,2})?|\d+(?:[,.]\d{1,2})?\s?(?:€|\bEUR\b)/gi), 8);
  const questions = unique(matchAll(text, /[^.?!]{8,80}\?/g), 8);
  const services = unique(matchAll(text, /\b(?:servizio|servizi|pacchetto|esperienza|attivita|attività|corso|evento|noleggio|consulenza)\b[^.?!]{0,80}/gi), 8);
  const offers = unique(matchAll(text, /\b(?:offerta|promo|promozione|sconto|speciale|gruppi|pacchetti)\b[^.?!]{0,80}/gi), 6);
  const testimonials = unique(matchAll(text, /“[^”]{12,120}”|"[^"]{12,120}"/g), 6);
  const strengths = unique(
    ['esperienza', 'professionalita', 'qualita', 'sicurezza', 'velocita', 'convenienza', 'organizzazione', 'divertimento'].filter((word) =>
      text.toLowerCase().includes(word)
    ),
    8
  );

  const slides = [
    ...services.slice(0, 4).map((item) => slide('service', item.split(/\s+/).slice(0, 4).join(' ').toUpperCase(), 'Servizio disponibile')),
    ...prices.slice(0, 3).map((item) => slide('price', item.toUpperCase(), 'Prezzo rilevato')),
    ...offers.slice(0, 3).map((item) => slide('offer', item.split(/\s+/).slice(0, 4).join(' ').toUpperCase(), 'Offerta disponibile')),
    ...questions.slice(0, 3).map((item) => slide('faq', item.replace(/\?$/, '?'), 'Risposta sul sito')),
    slide('contact', 'PRENOTA ORA', base.hostname.replace(/^www\./, ''), [...emails, ...phones].slice(0, 1).join(' ')),
    slide('cta', 'CONTATTACI', 'SCOPRI DI PIU', base.hostname.replace(/^www\./, ''))
  ];

  const result: WebsiteImport = {
    url: parsed.data.url,
    business: {
      name: title,
      slogan: '',
      description,
      industry: strengths.includes('divertimento') ? 'Intrattenimento' : ''
    },
    services,
    prices,
    offers,
    contacts: unique([base.hostname, ...emails, ...phones], 8),
    faqs: questions.map((question) => ({ question, answer: 'Risposta rilevata dal sito.' })),
    strengths,
    testimonials,
    slides
  };

  return NextResponse.json(result);
}
