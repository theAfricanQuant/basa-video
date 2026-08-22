# Basa Video roadmap

This roadmap sequences product risk rather than promising calendar dates. A milestone is complete only when its acceptance criteria are demonstrably true on the supported path.

## Product thesis

Basa should be the dependable publishing step between authored teaching material and finished narrated video. The source remains authoritative; speaker notes remain the narration contract; measured audio remains the timeline.

The near-term wedge is QMD and Reveal.js. Broader formats and interfaces should arrive through adapters around the same internal slide, narration and rendering pipeline.

## Shipped foundation — working MVP

The current implementation provides:

- QMD and existing Reveal.js HTML input.
- Standard Quarto and Reveal speaker-note extraction.
- Quarto rendering and Puppeteer slide capture.
- Free local Kokoro narration managed entirely through uv.
- Optional bring-your-own-key ElevenLabs narration with plan guards.
- FFprobe-measured slide duration and FFmpeg H.264/AAC output.
- Compact phrase-timed SRT and styled ASS captions.
- Narration caching, build manifests and voice-rights provenance.
- Platform-aware diagnostics for Windows, macOS and Linux.
- Apache-2.0 project licensing and maintained third-party notices.

## Milestone 1 — release-quality foundation

Make installation and the basic render contract dependable for people outside the development machine.

### Work

- Add CI for Node tests and licence checks on Windows, macOS and Linux.
- Exercise setup, doctor and a deterministic render fixture on real runners where native tooling permits it.
- Define the public package layout, versioning policy and release process; remove `private` only when the release checks pass.
- Add actionable diagnostics for unsupported browser, codec, model-download and file-path conditions.
- Test spaces, Unicode, long paths and platform-specific executable discovery.
- Publish a minimal quick-start deck and a troubleshooting path based on actual failure messages.

### Acceptance criteria

- A clean supported machine can install, run `basa-video doctor`, set up Kokoro and render the example by following the README.
- The same CLI syntax works on Windows, macOS and Linux.
- CI proves unit behavior on all three operating-system families.
- A release artifact contains every required source, schema, notice and licence file and no provider model weights.

## Milestone 2 — timeline fidelity

Close the largest quality gap without changing the QMD-first product contract.

### Work

- Model Reveal fragments as ordered visual states within a slide.
- Allow narration to target a whole slide or an individual fragment.
- Capture every fragment deterministically and preserve vertical-slide ordering.
- Introduce forced alignment for real phrase or word timestamps.
- Keep the compact single-line caption layout while using aligned timestamps.
- Add optional burned captions without making them the default.
- Detect unsupported animation, embedded-video and timing cases before rendering.

### Acceptance criteria

- A fixture with multiple fragments renders each visual state for exactly its narration window.
- Seeking and repeated renders produce identical fragment order and timing within a documented tolerance.
- Caption cues follow measured speech timestamps rather than proportional text weighting.
- Existing slide-level decks render without migration.

## Milestone 3 — voices and languages

Expand choice through a stable provider interface while retaining Kokoro as the lean default.

### Work

- Finish optional Chatterbox and Qwen provider adapters after licence, model-card and provenance review.
- Implement `setup --all-local` only after every advertised local provider passes setup and synthesis tests.
- Keep remote providers outside `--all-local`; require explicit selection and credentials.
- Add provider capability metadata for languages, accents, devices, cloning and alignment.
- Validate German end to end before advertising it; add later languages one tested path at a time.
- Record provider, model revision, voice identity, language and relevant rights metadata consistently.

### Acceptance criteria

- Every listed provider can be installed or selected using its documented command and can render the same conformance deck.
- `voices` reports only combinations the provider can actually synthesize.
- English remains fully supported; each advertised additional language has pronunciation and regression fixtures.
- Provider or model changes cannot reuse an incompatible cached narration file.

## Milestone 4 — richer teaching media

Support common educational-video needs while keeping timing deterministic.

### Work

- Mix optional background music with ducking and loudness normalization.
- Support embedded video clips with explicit ownership of their audio and duration.
- Add configurable transitions that do not alter narration synchronization.
- Expose caption position, safe-area and burn controls.
- Add chapter metadata, poster frames and optional thumbnail/contact-sheet output.

### Acceptance criteria

- Mixed audio meets a documented loudness target without clipping.
- Embedded media, transitions and captions are represented in the manifest.
- Media layers can be disabled to reproduce the lean slide-and-narration output.

## Milestone 5 — input adapters and a thin interface

Grow beyond QMD only after the renderer is dependable.

### Work

- Define and document the normalized slide-input adapter contract.
- Evaluate PPTX and PDF as the first non-HTML inputs, including how notes and accessibility information survive conversion.
- Add a local interface for selecting a deck, previewing notes and voices, viewing validation errors and starting the existing render command.
- Keep project files portable and source-controlled; the interface must not become a separate project format.

### Acceptance criteria

- Every new input adapter produces the same normalized slide records consumed by the existing renderer.
- CLI and interface renders share cache identity, manifests and output semantics.
- Unsupported source features are reported before synthesis begins.

## Deliberate non-goals for the lean path

- Replacing Quarto or becoming a full collaborative slide-authoring platform.
- Hosting a multi-tenant cloud rendering service before the local product is release-quality.
- Silent voice cloning, public-figure imitation or bypasses for provider consent controls.
- Bundling large model weights, FFmpeg or browsers inside the npm package without a separate distribution and licence review.
- Maintaining one rendering implementation per input format.

## How roadmap status changes

Roadmap edits should reflect evidence: tests passing, release artifacts produced or end-to-end fixtures rendered. New ideas belong in the milestone whose dependencies they require. If an idea does not strengthen the product thesis or share the existing pipeline, record it separately rather than expanding the lean path.
