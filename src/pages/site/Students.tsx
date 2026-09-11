import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section, FeatureCard } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";
import { Music2, Vibrate, Sparkles, HeartHandshake, Trophy, Smile } from "lucide-react";

export default function Students() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - For students</title>
        <meta name="description" content="For Deaf, hard-of-hearing, and hearing students: feel music, rhythm, and your surroundings through gentle vibration and light. Learn, play, and belong — together." />
        <link rel="canonical" href="https://ontenna.org/students" />
      </Helmet>
      <PageHero
        eyebrow="For students"
        title="Feel the music. Feel the moment."
        subtitle="Ontenna turns sound into vibration and light you can feel in your body. Catch the beat, follow your teacher, and join every classroom moment — whether you're Deaf, hard of hearing, or hearing."
      >
        <div className="flex flex-wrap gap-3">
          <GradientButton to="/download" size="lg">Get the app</GradientButton>
          <GradientButton to="/teachers" variant="outline" size="lg">For teachers</GradientButton>
        </div>
      </PageHero>

      <Section eyebrow="What it feels like" title="Sound you can wear.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Vibrate className="h-5 w-5" />} title="Feel the beat" body="A clip-on wearable translates rhythm and volume into gentle vibration and light, so you stay on the beat with everyone else." />
          <FeatureCard icon={<Music2 className="h-5 w-5" />} title="Music in your body" body="Drums, melodies, and live instruments become something you feel — not just something others hear." />
          <FeatureCard icon={<Sparkles className="h-5 w-5" />} title="Calm and focus" body="Guided breathing and attention exercises use slow, steady pulses to help you settle and concentrate." />
          <FeatureCard icon={<HeartHandshake className="h-5 w-5" />} title="Belong in class" body="When the teacher leads an exercise, your Ontenna moves with the room — you're part of every moment." />
          <FeatureCard icon={<Trophy className="h-5 w-5" />} title="Play and progress" body="Rhythm games and patterns turn practice into play, with levels that grow as you do." />
          <FeatureCard icon={<Smile className="h-5 w-5" />} title="Made for everyone" body="Built with Deaf and hard-of-hearing students — and just as fun for hearing classmates." />
        </div>
      </Section>

      <Section eyebrow="A day with Ontenna" title="From morning bell to last song.">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl glass p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Music class</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Stay on the beat</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Your teacher starts a percussion exercise and the metronome pulses straight to your Ontenna. You feel every hit and lead the next bar yourself.</p>
          </div>
          <div className="rounded-2xl glass p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Quiet time</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Breathe and reset</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Before a test, a slow guided pulse helps you breathe in and out. A calmer body, a clearer mind.</p>
          </div>
          <div className="rounded-2xl glass p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">After school</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Feel your songs</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">At home, play your favorite tracks and feel the music move through you with the Ontenna app.</p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Get started" title="Ready when you are.">
        <div className="rounded-3xl glass p-8 sm:p-10">
          <p className="max-w-2xl text-muted-foreground">
            Ask your teacher or school about Ontenna, or download the app to explore on your own. If your class already uses Ontenna PA, your wearable connects automatically.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <GradientButton to="/download" size="lg">Download the app</GradientButton>
            <GradientButton to="/schools" variant="outline" size="lg">Tell my school</GradientButton>
          </div>
        </div>
      </Section>
    </SiteShell>
  );
}
