import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ContentSlide, ReviewsImport } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 90;

const schema = z.object({
  query: z.string().min(2),
  mode: z.string().default('all')
});

function slide(kind: ContentSlide['kind'], title: string, subtitle = '', caption = '', rating?: number): ContentSlide {
  return {
    id: crypto.randomUUID(),
    kind,
    title,
    subtitle,
    caption,
    approved: true,
    source: 'google',
    rating
  };
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Dati recensioni non validi' }, { status: 400 });

  const key = request.headers.get('x-google-places-api-key') || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'Import recensioni Google non disponibile. Configurare GOOGLE_PLACES_API_KEY.' },
      { status: 503 }
    );
  }

  const textSearch = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  textSearch.searchParams.set('query', parsed.data.query);
  textSearch.searchParams.set('key', key);

  const search = await fetch(textSearch);
  const searchJson = await search.json();
  const placeId = searchJson.results?.[0]?.place_id;

  if (!placeId) return NextResponse.json({ error: 'Attivita non trovata su Google Places.' }, { status: 404 });

  const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  detailsUrl.searchParams.set('place_id', placeId);
  detailsUrl.searchParams.set('fields', 'name,rating,user_ratings_total,reviews');
  detailsUrl.searchParams.set('language', 'it');
  detailsUrl.searchParams.set('key', key);

  const details = await fetch(detailsUrl);
  const detailsJson = await details.json();
  const place = detailsJson.result;
  const reviews =
    place?.reviews?.map((review: any) => ({
      author: String(review.author_name ?? 'Cliente Google'),
      rating: Number(review.rating ?? 5),
      text: String(review.text ?? ''),
      relativeTime: String(review.relative_time_description ?? '')
    })) ?? [];

  const allText = reviews.map((review: { text: string }) => review.text.toLowerCase()).join(' ');
  const themes = ['qualita', 'professionalita', 'cortesia', 'divertimento', 'sicurezza', 'organizzazione', 'rapidita', 'convenienza'].filter((theme) =>
    allText.includes(theme)
  );

  const slides = [
    slide('reputation', '★★★★★', `${place.rating ?? '-'} / 5`, `Oltre ${place.user_ratings_total ?? 0} recensioni`, place.rating),
    slide('review', 'CLIENTI SODDISFATTI', 'Scelto da chi ci ha provato', '★★★★★', place.rating),
    ...reviews.slice(0, 4).map((review: { text: string; rating: number }) =>
      slide('review', review.text.split(/\s+/).slice(0, 3).join(' ') || 'Esperienza consigliata', 'Recensione Google verificata', '★★★★★', review.rating)
    )
  ];

  const result: ReviewsImport = {
    query: parsed.data.query,
    ratingAverage: place.rating ?? null,
    reviewCount: place.user_ratings_total ?? null,
    reputationSummary: `Valutazione ${place.rating ?? '-'} su 5 basata su ${place.user_ratings_total ?? 0} recensioni.`,
    themes,
    reviews,
    slides
  };

  return NextResponse.json(result);
}
