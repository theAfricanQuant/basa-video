# Basa Video

Basa is named for the Berom word for “teach.” Basa Video is the first focused
tool under that broader identity: it turns a narrated Quarto Reveal.js
presentation into a synchronized MP4. Standard speaker notes are the transcript;
measured narration duration controls each slide boundary.

The current MVP deliberately supports only QMD and Reveal.js HTML. Future input
formats can join through adapters without changing the narration-and-timing
pipeline.

## Requirements

- Node.js 22+
- uv, which provisions a managed Python 3.12 for the default local Kokoro provider
- Quarto
- Google Chrome or Chromium
- FFmpeg and FFprobe
- Optional: an ElevenLabs API key

Run `basa-video doctor` at any time for a platform-specific readiness report.
If Quarto is missing, `basa-video setup` installs a pinned official Quarto CLI
through uv. FFmpeg and Chrome remain native platform tools; the doctor prints
the exact next action when either is missing.

## Install and render

```bash
npm install
npm link
basa-video setup --accept-model-license
basa-video render examples/agentic-ai.qmd --output examples/agentic-ai.mp4
```

Speaker notes use standard Quarto syntax:

```markdown
## A narrated slide

Visible slide content.

::: {.notes}
This text is spoken while the slide is visible.
:::
```

Configure the presentation in YAML:

```yaml
video:
  language: en
  voice: kokoro:af_heart
  title-slide-notes: "Welcome to this presentation."
  pause-before-slide: 0.3
  pause-after-slide: 0.7
  caption-max-chars: 48
  caption-max-words: 8
  caption-font-size: 34
```

Kokoro is the free, local default. Its runtime is installed in an isolated
provider directory and the official model is pinned to an immutable revision.
Browse its American and British English voices:

```bash
basa-video voices --provider kokoro
basa-video voices --provider kokoro --search British
basa-video render deck.qmd --voice kokoro:bf_emma
```

Keep `ELEVENLABS_API_KEY` in the environment, never in the QMD. ElevenLabs
remains an explicit opt-in:

```bash
basa-video voices --provider elevenlabs --search Nigerian
basa-video render deck.qmd --provider elevenlabs --voice VOICE_ID --elevenlabs-plan paid
```

Outputs include the MP4, a universally compatible SRT file, a smaller styled
ASS caption file, and a cached build manifest in a `.basa-video/` directory
beside the input deck. Captions are emitted as short, single-line phrases whose
windows follow the measured narration duration. SRT font size is controlled by
the video player; ASS uses `caption-font-size` for predictable presentation.
Audio is reused when provider, voice, model, language, and transcript are
unchanged.

## Platform support

Basa uses the same commands on Windows, macOS, and Linux. uv owns the managed
Python 3.12 runtime, Kokoro packages, and the Quarto fallback; Basa never asks
users to repair or replace their system Python. See the
[platform guide](docs/PLATFORM_SUPPORT.md) for prerequisites and installation
commands on each operating system.

## MVP boundaries

- Each Reveal.js slide is captured as one stable visual state.
- Fragments, embedded video timelines, background music, and burned-in captions
  are future work.
- Existing Reveal.js HTML is accepted when it contains embedded `aside.notes`
  speaker notes.

## Licensing and responsible voice use

Basa Video is Apache-2.0-licensed. Review
[third-party notices](docs/THIRD_PARTY_NOTICES.md), the
[model and voice policy](docs/MODEL_AND_VOICE_POLICY.md), the cited
[licensing research](docs/LICENSING_RESEARCH.md), and
[trademark information](docs/TRADEMARKS.md). Run `npm run check:licenses`
before release. Reference-audio features require both explicit confirmation
and a consent-record file documenting the permitted use.

## Project direction

See the milestone-based [roadmap](docs/ROADMAP.md) for the path from the current
MVP to release-quality cross-platform rendering, fragment-level timing,
additional voices and languages, richer media, and future input adapters.
Coding agents and automated contributors should follow [AGENTS.md](AGENTS.md).
