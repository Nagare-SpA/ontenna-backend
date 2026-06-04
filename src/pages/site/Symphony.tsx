import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Search, Music2 } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";
import { fetchCatalogCount, fetchTopArtists, searchCatalog } from "@/services/symphonyCatalog";
import appMusic from "@/assets/app-music.jpg";
import appModes from "@/assets/app-modes.jpg";

const STEMS = [
  { name: "Drums", color: "hsl(0 84% 56%)", body: "The pulse — kick and snare onsets you feel in your chest." },
  { name: "Groove", color: "hsl(30 55% 42%)", body: "The bassline, the low end that moves the body." },
  { name: "Voice", color: "hsl(0 0% 92%)", body: "Vocal emphasis — the shape and stress of the singing." },
  { name: "Harmony", color: "hsl(160 64% 52%)", body: "Pads, FX and harmonies — the emotional texture." },
  { name: "Piano", color: "hsl(48 95% 55%)", body: "Keys and melodic phrases, as their own sensation." },
  { name: "Guitar", color: "hsl(271 91% 65%)", body: "Riffs and chords, distinct from the rest of the mix." },
];

const MODES = [
  { name: "Beat", body: "A clean metronome locked to the song's tempo." },
  { name: "Drums", body: "The full drum kit, hit by hit." },
  { name: "Groove", body: "Follow the bassline." },
  { name: "Voice", body: "Feel the vocal line and its emphasis." },
  { name: "Harmony", body: "Pads, harmonies and effects." },
  { name: "Piano", body: "Melodic keys." },
  { name: "Guitar", body: "Riffs and chords." },
  { name: "Suit", body: "Multi-device — each Ontenna plays a different stem." },
];

function CatalogExplorer() {
  const [query, setQuery] = useState("");
  const { data: count } = useQuery({ queryKey: ["catalog-count"], queryFn: fetchCatalogCount, staleTime: 1000 * 60 * 60 });
  const { data: artists } = useQuery({ queryKey: ["catalog-artists"], queryFn: () => fetchTopArtists(18), staleTime: 1000 * 60 * 60 });
  const { data: songs, isLoading } = useQuery({
    queryKey: ["catalog-songs", query],
    queryFn: () => searchCatalog(query, 24),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div>
      {count ? (
        <p className="text-lg text-muted-foreground">
          <span className="font-semibold text-foreground">{count.toLocaleString()}+</span> songs already
          mapped to haptics — and growing every week.
        </p>
      ) : null}

      {/* Search */}
      <div className="mt-8 flex items-center gap-3 rounded-full glass px-5 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the catalog — artist or song…"
          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-label="Search the Symphony catalog"
        />
      </div>

      {/* Top artists */}
      {artists && artists.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Top artists</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {artists.map((a) => (
              <button
                key={a.artist}
                type="button"
                onClick={() => setQuery(a.artist)}
                className="rounded-full hairline bg-[hsl(var(--card))] px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {a.artist} <span className="text-[hsl(var(--tertiary-foreground))]">· {a.song_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Songs grid */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-[hsl(var(--card))]" />
            ))
          : (songs || []).map((s, i) => (
              <div key={`${s.title}-${i}`} className="flex items-center gap-3 rounded-xl hairline bg-[hsl(var(--card))] p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-brand-soft text-primary">
                  <Music2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.artist}</p>
                </div>
              </div>
            ))}
      </div>
      {!isLoading && (songs || []).length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">No matches — try another artist or song.</p>
      )}
    </div>
  );
}

export default function Symphony() {
  return (
    <SiteShell>
      <Helmet>
        <title>Symphony — feel music with Ontenna</title>
        <meta
          name="description"
          content="Symphony turns any song into haptics, split by stems — drums, bass, vocals, piano, guitar — each as its own vibration on your Ontenna. Explore a catalog of 5,000+ songs."
        />
        <link rel="canonical" href="https://ontenna.org/symphony" />
      </Helmet>

      <PageHero
        eyebrow="Symphony · Music"
        title="Feel music in your body, one instrument at a time."
        subtitle="Symphony splits a song into its stems — drums, bass, vocals, piano, guitar — and turns each into its own vibration on your Ontenna, perfectly in sync with the music."
      >
        <div className="flex flex-wrap gap-3">
          <GradientButton to="/download" size="lg">Download the app</GradientButton>
          <GradientButton to="/signup" variant="outline" size="lg">Start free trial</GradientButton>
        </div>
      </PageHero>

      {/* What are stems */}
      <Section
        eyebrow="What are stems"
        title="A song isn't one thing. So why feel it as one?"
        intro="Every track is built from layers — the “stems”. Symphony separates them so you don't feel a blur of vibration: you feel the kick drum, the bassline, the voice, and the melody as distinct sensations."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEMS.map((s) => (
            <article key={s.name} className="rounded-2xl glass p-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: s.color }}>
                  <span className="text-xs font-bold" style={{ color: s.name === "Voice" ? "#000" : "#fff" }}>
                    {s.name[0]}
                  </span>
                </span>
                <h3 className="text-lg font-semibold text-foreground">{s.name}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* App visuals */}
      <Section eyebrow="In the app" title="Built to be played with.">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <p className="text-muted-foreground">
              Search any song, hit play, and watch the live equalizer light up the stems that are sounding.
              Pick a mode to focus on one layer — or turn on the full experience and feel everything at once.
            </p>
            <p className="text-muted-foreground">
              Playback syncs invisibly with Spotify or Apple Music, so the vibration lands at the exact moment
              the sound does.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src={appMusic} alt="Symphony player in the Ontenna app" loading="lazy" className="rounded-2xl hairline" />
            <img src={appModes} alt="Symphony modes in the Ontenna app" loading="lazy" className="mt-8 rounded-2xl hairline" />
          </div>
        </div>
      </Section>

      {/* Modes */}
      <Section eyebrow="Eight modes" title="Focus on one layer, or feel the whole band.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => (
            <article key={m.name} className="rounded-2xl hairline bg-[hsl(var(--card))] p-5">
              <h3 className="text-base font-semibold text-foreground">{m.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Suit */}
      <Section className="pt-0">
        <div className="rounded-[--radius] bg-gradient-brand p-10 sm:p-16">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">Symphony Suit</p>
          <h2 className="mt-4 h-section font-bold text-white">Every stem on its own Ontenna.</h2>
          <p className="mt-5 max-w-2xl text-white/85">
            Connect up to 7 Ontennas and let Suit mode spread the music across your body — drums on your chest,
            bass on your hip, vocals on your collar. A full-body, full-band experience.
          </p>
        </div>
      </Section>

      {/* Catalog (live) */}
      <Section eyebrow="The catalog" title="Thousands of songs, ready to feel." id="catalog">
        <CatalogExplorer />
      </Section>

      <Section className="pt-0">
        <div className="container-narrow text-center">
          <h2 className="h-section font-bold">Feel your favorite song tonight.</h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Download the app, pair your Ontenna, and start with a free month. The Ontenna device is required and sold separately.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <GradientButton to="/download" size="lg">Download on the App Store</GradientButton>
            <GradientButton to="/signup" variant="outline" size="lg">Create your account</GradientButton>
          </div>
        </div>
      </Section>
    </SiteShell>
  );
}
