'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const key = 'storymotion-settings';

type Settings = {
  openAiApiKey: string;
  googlePlacesApiKey: string;
  productionAppUrl: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({ openAiApiKey: '', googlePlacesApiKey: '', productionAppUrl: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(key);
    if (raw) setSettings(JSON.parse(raw) as Settings);
  }, []);

  function save() {
    window.localStorage.setItem(key, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm text-white/60 hover:text-white" href="/">
          Torna a StoryMotion AI
        </Link>
        <h1 className="mt-6 text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">Le chiavi salvate qui restano nel browser del dispositivo. In produzione puoi anche configurarle come variabili ambiente su Vercel.</p>
        <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <label className="mb-4 block text-sm text-white/65">
            OPENAI_API_KEY
            <input className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white" type="password" value={settings.openAiApiKey} onChange={(event) => setSettings((current) => ({ ...current, openAiApiKey: event.target.value }))} />
          </label>
          <label className="mb-4 block text-sm text-white/65">
            GOOGLE_PLACES_API_KEY
            <input className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white" type="password" value={settings.googlePlacesApiKey} onChange={(event) => setSettings((current) => ({ ...current, googlePlacesApiKey: event.target.value }))} />
          </label>
          <label className="mb-4 block text-sm text-white/65">
            Production URL
            <input className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white" value={settings.productionAppUrl} onChange={(event) => setSettings((current) => ({ ...current, productionAppUrl: event.target.value }))} />
          </label>
          <button className="h-10 rounded-md bg-electric px-4 text-sm font-semibold" onClick={save}>
            Salva impostazioni
          </button>
          {saved ? <span className="ml-3 text-sm text-green-300">Salvato</span> : null}
        </section>
      </div>
    </main>
  );
}
