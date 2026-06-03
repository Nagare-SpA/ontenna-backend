import { BellRing, Music2, Activity, MessageSquare, GraduationCap, type LucideIcon } from "lucide-react";

export interface FeatureDetailBlock {
  heading: string;
  body: string;
}

export interface AppFeature {
  /** Stable slug used in routes, e.g. /feature/symphony */
  id: string;
  name: string;
  /** One-line summary shown on the card */
  tagline: string;
  icon: LucideIcon;
  /** HSL color string for the accent dot/glow */
  accent: string;
  /** Short paragraph shown on the card / preview */
  summary: string;
  /** Structured detail shown on the dedicated screen */
  detail: FeatureDetailBlock[];
  /** Quick bullet highlights */
  highlights: string[];
}

/**
 * Canonical descriptions of the Ontenna iOS app sections.
 * Source: Ontenna_App_Descripcion.md — every claim mirrors the real app.
 */
export const APP_FEATURES: AppFeature[] = [
  {
    id: "alerts",
    name: "Alerts",
    tagline: "The sounds around you, felt the instant they happen.",
    icon: BellRing,
    accent: "hsl(0 84% 56%)",
    summary:
      "Ontenna listens for the sounds that matter — a doorbell, a smoke alarm, a baby crying, your name being called — and turns each one into its own vibration and color in real time.",
    detail: [
      {
        heading: "What it is",
        body: "Environmental sound detection that becomes haptic and light alerts. You pick which sounds to watch from a catalog, and Ontenna answers each one with a vibration pattern and color of its own.",
      },
      {
        heading: "What it's for",
        body: "Real-time awareness of important sounds: doorbell, smoke alarm, baby crying, sirens, your name being called, a dog, knocking at the door, and more — so you never miss what matters around you.",
      },
      {
        heading: "How it works",
        body: "It uses Apple's SoundAnalysis framework with sound-classification models running live on the audio from the Ontenna's own microphone (LC3 codec at 24 kHz, 10 ms frames over Bluetooth — never the iPhone's mic). It recognizes 50+ sounds across ~10 categories (emergency, baby & care, home, traffic, animals, tools, voice/audio, ambient). When a sound crosses a confidence threshold it fires the alert — a motor + LED pattern on the Ontenna, a local notification, and a logged event, with a per-sound cooldown so you're never overwhelmed.",
      },
    ],
    highlights: ["50+ sounds, ~10 categories", "Runs on the Ontenna mic, not the iPhone", "Per-sound vibration + color", "Live notifications + event log"],
  },
  {
    id: "symphony",
    name: "Symphony",
    tagline: "Feel music in your body, one instrument at a time.",
    icon: Music2,
    accent: "hsl(271 91% 65%)",
    summary:
      "Symphony splits a song into stems — drums, bass, vocals, instruments, piano, guitar — and gives each its own vibration, synced to playback. With Suit mode, up to 7 Ontennas spread the music across your whole body.",
    detail: [
      {
        heading: "What it is",
        body: "Music turned into haptics by stems (tracks): drums, bass, voice, instruments, piano, guitar — each with its own vibration, synchronized to playback.",
      },
      {
        heading: "What it's for",
        body: "Feeling music in your body: the rhythm, the bass, the emphasis of the voice, and the melodic textures, each as a distinct sensation. With Suit mode, up to 7 Ontennas split the stems across your body for a full-body, immersive experience.",
      },
      {
        heading: "How it works",
        body: "Each song has a pre-computed \"haptic score\" (JSON, schema 2.4.0): per-stem events (with energy and duration), a beat grid, song sections with their energy curves, and the lyrics shaped by vocal emphasis. The SymphonyEngine loads that score and syncs it to the playback position from Spotify (or Apple Music), firing vibrations at the exact moment. There are 8 modes: Beat (metronome), Drums, Groove (bass), Voice, Harmony (FX), Piano, Guitar, and Suit (multi-device). Spotify playback stays invisible — used only to sync. A catalog lets you browse by artist/album/genre, and a live equalizer shows which stems are playing.",
      },
    ],
    highlights: ["8 modes, incl. multi-device Suit", "Up to 7 Ontennas across the body", "Synced to Spotify / Apple Music", "Live stem equalizer"],
  },
  {
    id: "sports",
    name: "Sports",
    tagline: "Track every hit, rally, and serve across six sports.",
    icon: Activity,
    accent: "hsl(160 64% 52%)",
    summary:
      "Log impacts and session stats for racket and ball sports — Ping Pong, Squash, Tennis, Basketball, Padel, and Racquetball — with calorie estimates per session.",
    detail: [
      {
        heading: "What it is",
        body: "Impact and metrics tracking for racket and ball sports.",
      },
      {
        heading: "What it's for",
        body: "Keeping count of events per sport and session statistics (hits, rallies, serves, etc.) plus a calorie estimate. It covers six sports: Ping Pong, Squash, Tennis, Basketball, Padel, and Racquetball.",
      },
      {
        heading: "How it works",
        body: "Each sport has its own metric set (e.g. Ping Pong: table hits, paddle hits, rallies, longest rally). You tap a tile to bump a counter; the system computes duration, calories (using METs per sport), and saves the session. The architecture is ready to auto-count impacts by their acoustic signature in the future — today the counting is manual.",
      },
    ],
    highlights: ["6 sports supported", "Per-sport metric sets", "Duration + calorie estimates", "Session history saved"],
  },
  {
    id: "transcription",
    name: "Transcription",
    tagline: "Live speech-to-text, with captions in real time.",
    icon: MessageSquare,
    accent: "hsl(204 100% 60%)",
    summary:
      "Transcribe conversations, classes, or your own voice with live captions and automatic paragraph breaks on pauses. Export and share the full transcript.",
    detail: [
      {
        heading: "What it is",
        body: "Live voice-to-text transcription.",
      },
      {
        heading: "What it's for",
        body: "Transcribing conversations, classes, or your own voice, with real-time captions and automatic paragraph breaks during pauses. The full text can be exported and shared.",
      },
      {
        heading: "How it works",
        body: "It uses Apple's Speech framework (speech recognition) on the audio from the Ontenna's microphone over Bluetooth (24 kHz, decoded from LC3 to PCM). The recognizer language is selectable (es, en, ja, etc.). Partial results show instantly; when it detects a pause (~2.2 s) it inserts a paragraph break. The transcript exports as a text file.",
      },
    ],
    highlights: ["Real-time captions", "Selectable language", "Auto paragraph breaks", "Export as text"],
  },
  {
    id: "train",
    name: "Train",
    tagline: "Learn to read vibration as information.",
    icon: GraduationCap,
    accent: "hsl(38 100% 55%)",
    summary:
      "Games and exercises that build \"haptic literacy\" — the skill of distinguishing patterns, rhythms, and signals that Alerts and Symphony later rely on.",
    detail: [
      {
        heading: "What it is",
        body: "Games and exercises to learn to recognize and interpret haptic patterns.",
      },
      {
        heading: "What it's for",
        body: "Developing \"haptic literacy\": the ability to read vibration as information. It helps you learn to distinguish the patterns, rhythms, and signals that Alerts and Symphony then use.",
      },
      {
        heading: "How it works",
        body: "It offers 16 activities in 4 categories — Rhythm (steady beat, progressive tempo, irregular, pause patterns), Patterns (Morse code, recognition, repetition, complexity ladder), Attention (intensity ramps, direction cues, false-alarm control), and Calm (breathing, meditation, stress reset). Each activity plays patterns on the Ontenna and measures your response (accuracy and reaction time), with difficulty levels that tune the touch tolerance (Easy 120 ms / Normal 80 ms / Hard 50 ms). Progress (best score, streak, average accuracy) is saved per activity.",
      },
    ],
    highlights: ["16 activities, 4 categories", "Accuracy + reaction tracking", "Easy / Normal / Hard", "Progress saved per activity"],
  },
];

export function getFeatureById(id: string): AppFeature | undefined {
  return APP_FEATURES.find((f) => f.id === id);
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is Ontenna?",
    answer:
      "Ontenna is a wearable haptic device that translates sound and music into vibration and light, made for Deaf and hard-of-hearing people — and for anyone who wants to feel sound. The iOS app is the brain: it listens through the Ontenna device's own microphone, interprets what's happening, and drives the wearable's vibration motor and RGB LED over Bluetooth.",
  },
  {
    question: "Do I need the Ontenna device to use the app?",
    answer:
      "Yes. The app commands the Ontenna's motor and RGB LED and listens through its microphone over Bluetooth Low Energy. The wearable is sold separately and is required for every feature.",
  },
  {
    question: "Does it use my phone's microphone?",
    answer:
      "No. Alerts and Transcription run on the audio captured by the Ontenna's own microphone (LC3 codec at 24 kHz, streamed over Bluetooth), never the iPhone's microphone.",
  },
  {
    question: "How many Ontennas can I connect at once?",
    answer:
      "Up to 7 Ontennas at the same time, for full-body experiences. In Symphony's Suit mode, each device can play a different stem of the music across your body.",
  },
  {
    question: "Which sounds can Alerts detect?",
    answer:
      "Over 50 sounds across about 10 categories — emergency, baby & care, home, traffic, animals, tools, voice/audio, and ambient. You choose which alerts to enable, and each sound gets its own vibration pattern and color.",
  },
  {
    question: "How does Symphony sync with music?",
    answer:
      "Each song has a pre-computed haptic score. The SymphonyEngine syncs it to the playback position from Spotify or Apple Music and fires the vibrations at the exact moment. Playback stays invisible — it's only used for synchronization.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. When you create your account you get a one-time, 1-month free trial so you can explore everything before paying. After the trial, your selected plan continues automatically.",
  },
  {
    question: "What does the free trial include?",
    answer:
      "Full access to the app's features for one month — Alerts, Symphony, Sports, Transcription, and Train. The trial is available once per account.",
  },
];
