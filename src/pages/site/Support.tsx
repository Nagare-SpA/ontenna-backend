import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { GradientButton } from "@/components/site/GradientButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type TabKey = "ontenna-app" | "ontenna-pa" | "hardware" | "account" | "privacy";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ontenna-app", label: "Ontenna app · iPhone" },
  { key: "ontenna-pa", label: "Ontenna PA · iPad" },
  { key: "hardware", label: "Hardware" },
  { key: "account", label: "Account" },
  { key: "privacy", label: "Privacy" },
];

const FAQ: Record<TabKey, { q: string; a: string }[]> = {
  "ontenna-app": [
    { q: "How do I pair my Ontenna with the app?", a: "Open the Ontenna app, tap My Ontenna, and follow the 5-step pairing guide. Make sure Bluetooth is enabled on your iPhone." },
    { q: "The app says it can't find my device. What now?", a: "Check that the Ontenna is charged and powered on, that Bluetooth is enabled, and that no other phone has it paired. If it persists, restart the app." },
    { q: "How do I update firmware?", a: "When a new firmware is available the app prompts you. Keep the Ontenna near the iPhone and plugged in during the update." },
    { q: "Why doesn't the app work without the wearable?", a: "Ontenna is hardware-first by design. The app's haptic experience requires a physical Ontenna. As a fallback, system push notifications can still alert you." },
    { q: "Which languages does the app support?", a: "Eight: English, Japanese, Spanish, Portuguese, French, German, Korean, Simplified Chinese." },
    { q: "How do I switch between Listen, Learn and Music modes?", a: "Use the bottom navigation in the app. Each mode requires the wearable to be connected." },
    { q: "What sounds does Alerts detect?", a: "25 sounds across 5 categories: Emergency, Health & Care, Home, Traffic, Animals & Other." },
    { q: "Is my audio sent to the cloud?", a: "No. Audio is processed on-device. Nothing leaves your phone by default." },
    { q: "Does Ontenna replace hearing aids?", a: "No. Ontenna complements hearing aids and cochlear implants — it does not replace them." },
    { q: "I lost my Ontenna — how does the NFC tag help?", a: "Each Ontenna has an NFC tag. When scanned by any phone, it opens ontenna.org/userinfo/HEX with information to return it." },
    { q: "Can I use Ontenna while exercising?", a: "Yes. Sports mode supports 6 sports and 12 metrics with haptic feedback." },
    { q: "How do I export sports session data?", a: "From the Sports view, tap a session and use Share. Export options are JSON and CSV." },
  ],
  "ontenna-pa": [
    { q: "What is Ontenna PA?", a: "An iPad app that orchestrates up to 20 Ontenna wearables in real time, designed for inclusion classrooms, music therapy, and live performance." },
    { q: "What hardware do I need?", a: "An iPad (iPadOS 17+), the Ontenna Gateway, and one Ontenna per participant. A class-compliant USB audio interface is optional for live music." },
    { q: "How do I share my classroom dashboard?", a: "The classroom dashboard rolls out late 2026. Until then, sessions are managed locally on the iPad." },
    { q: "What audio interfaces are supported?", a: "Any class-compliant USB audio interface up to 192 kHz, including the Behringer UMC202HD." },
    { q: "Which instruments does the live music mode detect?", a: "Twelve: Kick, Snare, Hi-Hat, Cymbal, Percussion, Bass, Sub-Bass, Vocal, Guitar, Piano, Brass, Strings." },
    { q: "Which music styles ship as presets?", a: "Eight: Reggaeton, Techno, Pop, Rock, Classical, Hip-Hop, Salsa, Tropical." },
    { q: "How do I get Ontenna PA?", a: "It is currently in TestFlight. The App Store launch is planned for this year." },
    { q: "Does it work without the Ontenna Gateway?", a: "The Gateway is recommended for deployments above 5 wearables. For small sessions, direct BLE pairing is supported." },
    { q: "Can I run Ontenna PA on iPhone?", a: "Not at the moment. The iPad is required for the multi-Ontenna orchestration UI." },
    { q: "Is student data stored in the cloud?", a: "Only with explicit consent of the institution and parents when applicable. By default, session data lives on the iPad." },
    { q: "How do I onboard 20 Ontennas at once?", a: "Use the bulk pairing flow in DevicesView. The Gateway handles the BLE 5 Periodic Advertising for synchronised dispatch." },
    { q: "Can I customise haptic patterns?", a: "Patterns and presets are customisable per session and per device." },
  ],
  hardware: [
    { q: "How long does the Ontenna battery last?", a: "{TBD} — confirmed value will appear here." },
    { q: "Is Ontenna water resistant?", a: "{TBD} — IP rating to be confirmed." },
    { q: "How much does it weigh?", a: "{TBD}" },
    { q: "Where can I clip it?", a: "Hair, ear, collar, or clothes. Use the included clip and band." },
    { q: "How do I charge it?", a: "Use the supplied USB-C charging cable and dock." },
    { q: "What's the wireless range?", a: "BLE 5 — typically 10–30 m line of sight." },
    { q: "How do firmware updates work?", a: "Over the air through the Ontenna app. Updates are signed and verified." },
    { q: "What's inside?", a: "Nordic nRF54L15, RGB LED, PWM 8-bit haptic motor, microphone with LC3 codec, NFC tag." },
    { q: "Where is it made?", a: "Designed and assembled by Nagare Japan Inc. in Tokyo." },
    { q: "Warranty, returns, shipping?", a: "{TBD}" },
    { q: "Where do I buy one?", a: "The Ontenna device is currently on a waitlist. Reserve yours at /reserve." },
    { q: "What's the price?", a: "{TBD} — pricing to be announced." },
  ],
  account: [
    { q: "How do I create an account?", a: "Open the Ontenna app and follow the onboarding. An email is the only required field." },
    { q: "How do I delete my account?", a: "Email support@ontenna.org from the address tied to your account." },
    { q: "I forgot my password.", a: "Use the 'Forgot password' link on the sign-in screen of the app." },
    { q: "Can I move my account to a different country?", a: "Yes — change your country in Settings. Your data follows you." },
    { q: "Can I have multiple Ontennas on one account?", a: "Yes. Each Ontenna shows up under My Ontenna in the app." },
    { q: "How do I change the app language?", a: "Settings → Language. The wearable doesn't have a language; the app does." },
    { q: "Can my child use my account?", a: "We recommend a separate account for each user. For school deployments, see Ontenna PA." },
    { q: "Where is my data stored?", a: "On your device for app-local data. On secure cloud infrastructure for account data." },
    { q: "Can I export my data?", a: "Yes — request an export via support@ontenna.org. We respond within 30 days." },
    { q: "How do I revoke a paired Ontenna?", a: "From My Ontenna, tap Forget device. The wearable returns to factory pairing state." },
    { q: "Do I need an account to use Ontenna?", a: "An account is recommended for cross-device sync and lesson progress, but not strictly required." },
    { q: "Can I use TestFlight without an account?", a: "Yes — TestFlight requires an Apple ID, but no Ontenna account." },
  ],
  privacy: [
    { q: "Is my audio recorded?", a: "No. The Ontenna and the iPhone process audio on device. Nothing is recorded or uploaded by default." },
    { q: "Does Ontenna sell my data?", a: "No. Never." },
    { q: "Is Ontenna GDPR / CCPA / APPI compliant?", a: "Yes. Read our full Privacy policy for details and your rights." },
    { q: "Where do I read the full privacy policy?", a: "ontenna.org/privacy" },
    { q: "Can I opt out of crash diagnostics?", a: "Yes — Settings → Diagnostics → Off." },
    { q: "How do I report a security issue?", a: "Email support@ontenna.org with the subject 'Security'." },
    { q: "Can schools see what students do at home?", a: "No. Ontenna PA only sees data inside the school's session." },
    { q: "Do you use third-party analytics?", a: "No tracking pixels, no Google Analytics, no third-party cookies." },
    { q: "What happens to my data if I delete the app?", a: "App-local data is removed. Account data is deleted on request via support@ontenna.org." },
    { q: "How long do you keep my data?", a: "As long as your account exists, plus a short retention window for legal compliance." },
    { q: "Are firmware updates signed?", a: "Yes, signed and verified before installation." },
    { q: "Who can I contact about privacy?", a: "support@ontenna.org" },
  ],
};

export default function Support() {
  const initial = (typeof window !== "undefined" && (window.location.hash.slice(1) as TabKey)) || "ontenna-app";
  const validInitial: TabKey = (TABS.find((t) => t.key === initial)?.key) ?? "ontenna-app";
  const [tab, setTab] = useState<TabKey>(validInitial);

  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - Support</title>
        <meta name="description" content="Help with the Ontenna app, Ontenna PA, the wearable, and your account." />
        <link rel="canonical" href="https://ontenna.org/support" />
      </Helmet>
      <PageHero
        eyebrow="Support"
        title="How can we help?"
        subtitle="One support center for the Ontenna app, Ontenna PA, the wearable, and your account."
      >
        <div className="flex flex-wrap gap-3">
          <GradientButton href="mailto:support@ontenna.org">Email support@ontenna.org</GradientButton>
          <GradientButton to="/contact" variant="outline">Contact form</GradientButton>
        </div>
      </PageHero>
      <section className="container-site pb-24 pt-12">
        <div role="tablist" aria-label="Support topics" className="flex flex-wrap gap-2 hairline-b pb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => { setTab(t.key); window.history.replaceState(null, "", `#${t.key}`); }}
              className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-gradient-brand text-white"
                  : "text-muted-foreground hover:text-foreground hairline"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-10">
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ[tab].map((f, i) => (
              <AccordionItem key={i} value={`q-${i}`} className="rounded-[--radius] hairline bg-[hsl(var(--card))] px-5 data-[state=open]:bg-[hsl(var(--elevated))]">
                <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </SiteShell>
  );
}