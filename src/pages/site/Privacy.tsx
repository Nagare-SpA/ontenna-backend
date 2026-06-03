import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";

const SECTIONS = [
  { id: "scope", n: "1", title: "Introduction & scope", body: (<><p>This Privacy Policy applies to the Ontenna ecosystem published by Nagare Japan Inc., including the Ontenna app for iPhone, the Ontenna PA app for iPad, the Ontenna haptic device, and the website ontenna.org.</p><p>We are committed to data minimisation. We collect only what is needed to make the experience work.</p></>) },
  { id: "data", n: "2", title: "What data we collect", body: (<><p><strong>Account data</strong> (optional): email, display name, language preference.</p><p><strong>Device data:</strong> Ontenna identifier, firmware version, battery level, pairing state.</p><p><strong>App settings:</strong> selected modes, lesson progress, alert categories you enabled.</p><p><strong>Audio:</strong> the microphone of the Ontenna and the iPhone process audio <em>on device</em>. Audio is never recorded, never uploaded, and never sent to the cloud by default.</p><p><strong>Diagnostics</strong> (optional, opt-in): anonymous crash logs to help us fix bugs.</p></>) },
  { id: "ios", n: "3", title: "Ontenna app — iPhone", body: (<><p>The iPhone app uses Apple SoundAnalysis for the 25 alert categories and a custom DSP pipeline for the Music and Listen modes. All processing happens on your device.</p><p>Bluetooth is required to communicate with the Ontenna wearable. Microphone access is required for Listen and Music modes. Notifications are used as a fallback when the wearable is not connected.</p></>) },
  { id: "events", n: "4", title: "Ontenna PA — iPad (Events & Education)", body: (<><p>Ontenna PA orchestrates up to 20 Ontenna devices through the Ontenna Gateway over BLE 5 Periodic Advertising. Audio enters via the iPad microphone or a class-compliant USB audio interface, is analysed locally (FFT 4096, 12 instruments), and dispatched as haptic patterns.</p><p>Roster, classroom, and student-progress data, when used, are stored only with the explicit consent of the educational institution and the parent or guardian when applicable.</p></>) },
  { id: "use", n: "5", title: "How we use data", body: (<p>To operate the wearable and apps, to deliver lessons and progress, to provide support when you contact us, and to improve the products. We do not sell your data, ever.</p>) },
  { id: "storage", n: "6", title: "Storage & retention", body: (<p>Account data is stored on secure cloud infrastructure. App-only data lives on your device. We retain account data for as long as your account exists and delete it on request.</p>) },
  { id: "sharing", n: "7", title: "Sharing with third parties", body: <p>None by default. We do not share your data with advertisers or data brokers.</p> },
  { id: "rights", n: "8", title: "Your rights (GDPR · CCPA · APPI)", body: <p>You can access, export, correct, or delete your data at any time. Write to <a className="text-primary" href="mailto:support@ontenna.org">support@ontenna.org</a>.</p> },
  { id: "children", n: "9", title: "Children & education", body: <p>Use of Ontenna in classrooms requires the consent of the institution and parental consent where applicable. We never knowingly collect personal data from children outside that framework.</p> },
  { id: "security", n: "10", title: "Security", body: <p>Encryption in transit and at rest. BLE communications use the standard pairing security model. Firmware updates are signed and verified.</p> },
  { id: "changes", n: "11", title: "Changes & contact", body: <p>We will publish material changes here. For any privacy question, contact <a className="text-primary" href="mailto:support@ontenna.org">support@ontenna.org</a>.</p> },
];

export default function Privacy() {
  return (
    <SiteShell>
      <Helmet>
        <title>Privacy — Ontenna</title>
        <meta name="description" content="The Ontenna privacy policy: what we collect, how we use it, your rights." />
        <link rel="canonical" href="https://ontenna.org/privacy" />
      </Helmet>
      <PageHero eyebrow="Legal" title="Privacy" subtitle="One policy for the Ontenna app, Ontenna PA, the wearable, and ontenna.org. Last updated: May 2026." />
      <section className="container-narrow py-20">
        <nav aria-label="Sections" className="mb-12 rounded-[--radius] hairline bg-[hsl(var(--card))] p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--tertiary-foreground))]">On this page</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-sm text-muted-foreground hover:text-foreground">{s.n}. {s.title}</a></li>
            ))}
          </ol>
        </nav>
        <div className="space-y-14">
          {SECTIONS.map((s) => (
            <article key={s.id} id={s.id} className="scroll-mt-24">
              <p className="text-xs font-mono text-[hsl(var(--tertiary-foreground))]">§{s.n}</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">{s.title}</h2>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">{s.body}</div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}