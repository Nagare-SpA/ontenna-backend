// "As featured in" logo wall for the Home page.
// Wordmarks are rendered as styled text (monochrome, brand-evocative type) —
// no third-party logo image assets, so no trademark clearance needed.
// Every entry links to a verified story/profile about Ontenna.

interface PressItem {
  name: string;
  /** Small credential line under the wordmark */
  sub: string;
  href: string;
  /** Wordmark typography style */
  style?: React.CSSProperties;
  /** Extra tailwind classes for the wordmark text */
  className?: string;
}

const SERIF = "Georgia, 'Times New Roman', serif";

const PRESS: PressItem[] = [
  {
    name: "WIRED",
    sub: "Feature, 2017",
    href: "https://www.wired.com/story/fujitsu-ontenna-deaf-people-vibration-clip/",
    className: "font-extrabold tracking-[0.35em]",
  },
  {
    name: "Forbes",
    sub: "30 Under 30 Asia",
    href: "https://www.forbes.com/profile/tatsuya-honda/",
    style: { fontFamily: SERIF },
    className: "font-bold",
  },
  {
    name: "MIT Technology Review",
    sub: "Innovators Under 35",
    href: "https://www.innovatorsunder35.com/the-list/tatsuya-honda/",
    className: "font-semibold",
  },
  {
    name: "The Japan Times",
    sub: "Business · Tech",
    href: "https://www.japantimes.co.jp/news/2016/12/12/business/tech/hearing-aids-headed-new-vibe-ontenna/",
    style: { fontFamily: SERIF },
    className: "font-bold",
  },
  {
    name: "The Government of Japan",
    sub: "KIZUNA feature, 2025",
    href: "https://www.japan.go.jp/kizuna/2025/10/new_device_connects_worlds_without_sound.html",
    className: "font-semibold tracking-wide",
  },
  {
    name: "NIKKEI",
    sub: "X-TREND series",
    href: "https://xtrend.nikkei.com/atcl/contents/18/00433/00001/",
    className: "font-extrabold tracking-[0.18em]",
  },
  {
    name: "PCWorld",
    sub: "Feature",
    href: "https://www.pcworld.com/article/410547/fujitsus-ontenna-could-be-a-big-deal-for-the-deaf.html",
    className: "font-extrabold italic",
  },
  {
    name: "VentureBeat",
    sub: "Feature",
    href: "https://venturebeat.com/mobile/this-smart-hairclip-translates-sound-to-vibrations-for-the-hearing-impaired/",
    className: "font-bold",
  },
  {
    name: "GOOD DESIGN AWARD",
    sub: "Gold Award 2019",
    href: "https://www.g-mark.org/en/gallery/winners/9e073de5-803d-11ed-af7e-0242ac130002?years=2019",
    className: "font-extrabold tracking-[0.12em]",
  },
  {
    name: "Falling Walls",
    sub: "Science Breakthrough 2021",
    href: "https://falling-walls.com/people/tatsuya-honda/",
    className: "font-bold tracking-wide",
  },
  {
    name: "wareable",
    sub: "Feature",
    href: "https://www.wareable.com/wearable-tech/ontenna-smart-hair-clip-for-deaf-sense-sound-4524",
    className: "font-bold lowercase tracking-tight",
  },
  {
    name: "CNN Chile",
    sub: "Nagare acquires Ontenna",
    href: "https://www.cnnchile.com/pais/nagare-hace-historia-es-la-primera-empresa-latinoamericana-en-comprar-una-tecnologia-completa-a-japon/",
    className: "font-extrabold tracking-tight",
  },
  {
    name: "Design Indaba",
    sub: "Creative work",
    href: "https://www.designindaba.com/articles/creative-work/tatsuya-hondas-hairpin-enables-you-feel-sounds",
    className: "font-semibold",
  },
  {
    name: "Asian Scientist",
    sub: "Rising Scientists, 2022",
    href: "https://www.asianscientist.com/2022/02/features/asias-rising-scientists-tatsuya-honda/",
    style: { fontFamily: SERIF },
    className: "font-semibold",
  },
  {
    name: "IAUD",
    sub: "International Design Award · Grand Award 2019",
    href: "https://humancentereddesign.org/news-events/iaud-international-design-awards-2019",
    className: "font-extrabold tracking-[0.3em]",
  },
  {
    name: "JAPAN TODAY",
    sub: "Tech",
    href: "https://japantoday.com/category/tech/fujitsu-offers-free-access-to-%27ontenna%27-for-hearing-impaired-students",
    className: "font-bold tracking-[0.14em]",
  },
];

export function PressLogos() {
  return (
    <section className="container-site py-24" aria-labelledby="press-heading">
      <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--tertiary-foreground))]">
        Press &amp; recognition
      </p>
      <h2 id="press-heading" className="mt-4 h-section font-bold">
        As featured around the world.
      </h2>
      <p className="mt-5 max-w-2xl text-muted-foreground">
        A decade of coverage and awards — from global tech press to Japan's top design honors. Tap any logo to read the story.
      </p>

      <ul className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[--radius] bg-[hsl(var(--border))] hairline sm:grid-cols-3 lg:grid-cols-4">
        {PRESS.map((p) => (
          <li key={p.name} className="bg-background">
            <a
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full min-h-[110px] flex-col items-center justify-center gap-1.5 px-4 py-7 text-center transition-colors hover:bg-[hsl(var(--card))]"
              aria-label={`${p.name} — ${p.sub} (opens in a new tab)`}
            >
              <span
                style={p.style}
                className={`text-base leading-snug text-muted-foreground transition-colors group-hover:text-foreground sm:text-lg ${p.className ?? ""}`}
              >
                {p.name}
              </span>
              <span className="text-[11px] leading-tight text-[hsl(var(--tertiary-foreground))] transition-colors group-hover:text-primary">
                {p.sub}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
