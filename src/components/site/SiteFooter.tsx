import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OntennaLogo } from "./OntennaLogo";
import { PulseDot } from "./PulseDot";
import { WaveformDivider } from "./WaveformDivider";

export function SiteFooter() {
  const { t } = useTranslation();

  const cols = [
    {
      title: t("footer.product", "Product"),
      links: [
        { to: "/device", label: t("footer.device", "Device") },
        { to: "/app", label: t("footer.app", "Ontenna app (iPhone)") },
        { to: "/teachers", label: t("footer.teachersApp", "Ontenna PA (iPad)") },
        { to: "/download", label: t("footer.download", "Download") },
        { to: "/reserve", label: t("footer.reserve", "Reserve") },
      ],
    },
    {
      title: t("footer.education", "Education"),
      links: [
        { to: "/schools", label: t("footer.schools", "Schools") },
        { to: "/learn", label: t("footer.learn", "Haptic language") },
        { to: "/science", label: t("footer.science", "Science & accessibility") },
      ],
    },
    {
      title: t("footer.company", "Company"),
      links: [
        { to: "/story", label: t("footer.story", "Our story") },
        { to: "/about", label: t("footer.about", "About Nagare Japan") },
        { to: "/community", label: t("footer.community", "Community") },
        { to: "/press", label: t("footer.press", "Press") },
      ],
    },
    {
      title: t("footer.support", "Support"),
      links: [
        { to: "/support", label: t("footer.supportCenter", "Support center") },
        { to: "/contact", label: t("footer.contact", "Contact") },
        { to: "/privacy", label: t("footer.privacy", "Privacy") },
        { to: "/terms", label: t("footer.terms", "Terms") },
        { to: "/accessibility-statement", label: t("footer.accessibility", "Accessibility statement") },
      ],
    },
  ];

  return (
    <footer className="hairline-t bg-background">
      <WaveformDivider />
      <div className="container-site py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <OntennaLogo size={32} withWordmark />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("footer.manifesto", "Made with the Deaf community. Tokyo · Worldwide.")}
            </p>
            <div className="mt-6">
              <PulseDot label="Live · 72 BPM" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-4">
            {cols.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {col.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-8 hairline-t pt-10 sm:grid-cols-2 md:grid-cols-3">
          <address className="not-italic">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">{t("footer.officeJapan", "Japan")}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Ginza TH Building 9F<br />
              7-13-20 Ginza, Chuo-ku, Tokyo 104-0061
            </p>
            <a href="mailto:japan@ontenna.org" className="mt-2 inline-block text-sm text-muted-foreground hover:text-foreground">
              japan@ontenna.org
            </a>
          </address>
          <address className="not-italic">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">{t("footer.officeChile", "Chile")}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Apoquindo 5950, Piso 8<br />
              Las Condes, Santiago
            </p>
            <a href="mailto:chile@ontenna.org" className="mt-2 inline-block text-sm text-muted-foreground hover:text-foreground">
              chile@ontenna.org
            </a>
          </address>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">Contact</p>
            <a href="mailto:support@ontenna.org" className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground">
              support@ontenna.org
            </a>
            <p className="mt-2 text-sm text-muted-foreground">
              <a href="https://www.ontenna.org" className="hover:text-foreground">www.ontenna.org</a>
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 hairline-t pt-6 text-xs text-[hsl(var(--tertiary-foreground))] sm:flex-row sm:items-center">
          <p>{t("footer.copyright", "© 2026 Nagare Japan Inc.")}</p>
          <p>Ontenna is a registered name used under license by Nagare Japan Inc.</p>
        </div>
      </div>
    </footer>
  );
}