# Basa Video agent guide

## Product invariant

Basa turns authored presentation sources and their speaker notes into synchronized narrated video. Preserve the lean path: input → normalized slides → narration → measured timing → media package.

New input formats must normalize into the existing slide model. New providers must implement the existing narration boundary. Avoid parallel pipelines for individual formats or providers.

## Read before changing

- Product scope, sequencing or new features: read `docs/PRODUCT_DIRECTION.md` and `docs/ROADMAP.md`.
- TTS providers, models, voices, consent or commercial-use behavior: read `docs/MODEL_AND_VOICE_POLICY.md`, `docs/LICENSING_RESEARCH.md` and `docs/VOICE_RIGHTS_CHECKLIST.md`.
- Dependencies, distributed artifacts or release packaging: read `docs/THIRD_PARTY_NOTICES.md` and run the repository licence check.
- Tool discovery, installation or operating-system behavior: read `docs/PLATFORM_SUPPORT.md`.

## Environment contract

- Use Node.js 22 or newer for the CLI and tests.
- Use `uv` for every Python runtime, environment, package and script invocation. Treat system Python as outside the product contract.
- Keep Kokoro as the free local default. ElevenLabs remains an explicit bring-your-own-key provider.
- Treat Quarto, Chrome or Chromium, FFmpeg and FFprobe as external tools resolved through `src/toolchain.mjs`. Quarto may use the pinned uv-managed fallback.
- Keep source modules as ESM `.mjs` and Python helpers under `scripts/`.

## Change workflow

1. Trace the affected command from `src/cli.mjs` to its module and tests. Read the relevant documents listed above.
2. Add or update the smallest test that proves the requested behavior and its failure mode.
3. Implement through the existing slide, narration and manifest boundaries.
4. Run `npm test`. Run `npm run check:licenses` when dependencies, providers, models, notices or packaging change.
5. For rendering changes, perform an end-to-end example render when the required native tools and provider runtime are available. Report any platform path that was not exercised.
6. Update the roadmap only when an acceptance criterion becomes true; move work between milestones only when the product dependency order changes.

## Completion checks

- Slide timing is derived from measured audio duration plus configured lead and trail pauses.
- A slide without narration fails clearly unless an explicit supported fallback supplies it.
- Cache identity changes whenever provider, voice, model, language, speed or transcript changes.
- The manifest records any new timing, provider, model, caption or provenance behavior.
- Cross-platform changes update resolver tests and remediation text for Windows, macOS and Linux.
- User-facing behavior is documented in `README.md`; design intent belongs in `docs/`.

## Scope guard

Prefer reliability and source fidelity over adding an authoring studio. A thin local interface may expose the existing pipeline later; it should call the same core modules as the CLI. Voice cloning or reference-audio work requires explicit rights records and must preserve provenance safeguards.
