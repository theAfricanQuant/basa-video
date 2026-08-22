# Basa Video roadmap

This roadmap sequences product risk rather than promising calendar dates. A milestone is complete only when its acceptance criteria are demonstrably true on the supported path.

## Product thesis

Basa should be the dependable publishing step between authored teaching material and finished narrated video. The source remains authoritative; reviewed narration remains the speech contract; measured audio remains the timeline.

The near-term wedge is QMD and Reveal.js. Broader formats and interfaces should arrive through adapters around the same internal slide, narration and rendering pipeline.

A future course-authoring layer may turn a prompt, transcript, book, PDF or
notebook into reviewed lessons. That layer must remain separate from the
renderer: an agent can propose structure and narration, but only a validated,
versioned course manifest may enter Basa's deterministic media pipeline.

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

## Current hand-off — where implementation stops today

The shipped input boundary ends at QMD and Reveal.js HTML containing embedded
speaker notes. Each slide becomes one stable visual state. A generic Basa
manifest, PDF input, image-sequence input, PPTX input, AI narration drafting and
a local graphical interface are design decisions or roadmap work, not current
CLI capabilities.

The next architectural seam is a versioned presentation manifest that separates
ordered visuals and reviewed narration from the authoring format. The existing
QMD and Reveal adapters should produce this model before PDF or other adapters
are added.

## Parallel experiment — Pi course-authoring proof

Test the larger idea now without making the release-quality renderer depend on
an agent framework. The proof should use the existing QMD path as its compiler
target and produce only one reviewed pilot lesson.

### Work

- Embed a pinned, reviewed version of the Pi SDK as an optional authoring layer.
- Ship first-party skills for course planning, lesson design, narration editing,
  grounding review and Basa rendering; do not discover arbitrary third-party
  skills or extensions.
- Accept Markdown or a plain transcript and draft a three-lesson course plan
  with explicit learning objectives and source references.
- Require teacher approval of the plan before lesson authoring and approval of
  lesson one before rendering.
- Generate QMD with speaker notes as an internal artifact, then invoke the
  existing Basa renderer without changing its timing or TTS contract.
- Expose narrow typed tools for ingesting sources, saving lessons, validating
  references, previewing and rendering; keep general shell and write access out
  of the agent session.
- Preserve source hashes, prompts, approvals and generated-artifact versions so
  the result can be audited and regenerated.

### Acceptance criteria

- A Markdown document or transcript produces a three-lesson proposal whose
  objectives and factual claims trace back to the supplied source.
- Nothing is rendered before the course plan and pilot lesson are approved.
- Lesson one contains complementary slides and speaker notes, passes the
  current deck validation and renders as a synchronized MP4.
- Regenerating lesson one does not rewrite approved lessons or invalidate
  unchanged narration caches.
- The experiment can be removed without changing the current QMD-to-video CLI.

## Milestone 1 — release-quality foundation

Make installation and the basic render contract dependable for people outside the development machine.

### Work

- Add CI for Node tests and licence checks on Windows, macOS and Linux.
- Exercise setup, doctor and a deterministic render fixture on real runners where native tooling permits it.
- Define the public package layout, versioning policy and release process; remove `private` only when the release checks pass.
- Define and validate version 1 of the normalized Basa presentation manifest.
- Make the QMD and Reveal paths produce the same manifest-backed slide records without changing their user-facing behavior.
- Add actionable diagnostics for unsupported browser, codec, model-download and file-path conditions.
- Test spaces, Unicode, long paths and platform-specific executable discovery.
- Publish a minimal quick-start deck and a troubleshooting path based on actual failure messages.

### Acceptance criteria

- A clean supported machine can install, run `basa-video doctor`, set up Kokoro and render the example by following the README.
- The same CLI syntax works on Windows, macOS and Linux.
- CI proves unit behavior on all three operating-system families.
- A release artifact contains every required source, schema, notice and licence file and no provider model weights.
- A saved manifest can reproduce the ordered visuals, narration configuration and cache identity of its source render.

## Milestone 2 — universal static-deck path

Provide the easiest non-QMD workflow without creating another rendering engine.

### Work

- Add `basa-video init` to create a reviewed narration manifest from a PDF or ordered image sequence.
- Render PDF pages and ordered images through the existing narration, timing, caption and packaging pipeline.
- Support a Markdown or YAML narration sidecar with one explicit entry per page or image.
- Extract visible PDF text as optional drafting context without treating it as approved narration.
- Add an AI-assisted narration-draft command that writes an editable manifest and never renders unpublished draft text automatically.
- Validate missing pages, extra narration entries, duplicate identifiers and unsupported encrypted PDFs before synthesis.

### Acceptance criteria

- A user can export slides from an arbitrary presentation tool as PDF, create or review one narration entry per page and render the same media package produced by the QMD path.
- PDF, image and QMD inputs converge on the same normalized slide records, cache rules, manifests and FFmpeg pipeline.
- Drafted narration requires an explicit review-to-render step.
- Page order, page count and narration coverage fail clearly before TTS costs or model work begin.

## Milestone 3 — timeline fidelity

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

## Milestone 4 — voices and languages

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

## Milestone 5 — richer teaching media

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

## Milestone 6 — richer input adapters and a thin interface

Grow beyond QMD only after the renderer is dependable.

### Work

- Extend the normalized adapter contract beyond static PDF and image inputs.
- Evaluate PPTX as the first structured office input, including how speaker notes, accessibility information, fonts and layouts survive conversion.
- Evaluate browser URLs and other presentation formats only when they can provide stable ordered visuals and reviewed narration.
- Add a local interface for selecting a deck, previewing notes and voices, viewing validation errors and starting the existing render command.
- Keep project files portable and source-controlled; the interface must not become a separate project format.

### Acceptance criteria

- Every new input adapter produces the same normalized slide records consumed by the existing renderer.
- CLI and interface renders share cache identity, manifests and output semantics.
- Unsupported source features are reported before synthesis begins.

## Milestone 7 — source-to-course generation

Promote the experiment into a product layer only after the manifest, adapters
and renderer are dependable. Pi acts as the course director; Basa remains the
studio that validates, narrates, times, captions and packages every lesson.

### Work

- Add ingestion adapters for books, PDFs, transcripts, notebooks and prompts
  that produce chunks, stable source locations, hashes and a searchable source
  map.
- Define a versioned course manifest containing audience, objectives, lesson
  order, source references, approvals, presentation artifacts and output media.
- Add first-party skills for course architecture, format-specific ingestion,
  assessment authoring, narration editing, grounding review, rights review and
  render orchestration.
- Add typed tools for source search, course-plan creation, lesson persistence,
  reference validation, preview, render and course packaging.
- Use retrieval over indexed source chunks for long works; do not place an
  entire book or transcript in the agent's standing context.
- Execute notebook cells only in an opt-in, resource-bounded sandbox managed
  through uv; preserve cell order and outputs and report failures as lesson
  build errors.
- Make plan approval, pilot-lesson approval and batch-render approval durable
  workflow gates.
- Support resumable per-lesson generation, isolated regeneration, provenance
  reports, captions and a course-level output manifest.
- Require a rights declaration for every ingested source and constrain voice
  selection through the existing model-and-voice policy.

### Acceptance criteria

- Every source-derived claim in an approved lesson has a stable reference to
  the ingested material or is explicitly marked as an instructor-authored
  addition.
- A teacher approves the course plan before lesson generation and approves a
  pilot lesson before any batch render.
- Each lesson runs in a bounded session and can be regenerated without changing
  other approved lessons.
- Notebook execution is disabled by default and cannot escape its declared
  project, time, memory or network policy.
- Books, PDFs, transcripts, notebooks and prompts converge on the same course
  manifest, then on the same presentation manifest and renderer.
- Agent-generated drafts never bypass validation, narration review, provider
  policy, caching, timing or packaging in the existing Basa pipeline.

## Deliberate non-goals for the lean path

- Replacing Quarto or becoming a full collaborative slide-authoring platform.
- Hosting a multi-tenant cloud rendering service before the local product is release-quality.
- Silent voice cloning, public-figure imitation or bypasses for provider consent controls.
- Bundling large model weights, FFmpeg or browsers inside the npm package without a separate distribution and licence review.
- Maintaining one rendering implementation per input format.

## How roadmap status changes

Roadmap edits should reflect evidence: tests passing, release artifacts produced or end-to-end fixtures rendered. New ideas belong in the milestone whose dependencies they require. If an idea does not strengthen the product thesis or share the existing pipeline, record it separately rather than expanding the lean path.
