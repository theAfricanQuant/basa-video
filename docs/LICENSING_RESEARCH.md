# Licensing and voice-rights research

Status: research baseline for the pre-release project, 22 August 2026. This is
an engineering compliance guide, not legal advice. Recheck provider terms and
model cards before each public release because hosted-service terms and model
artifacts can change.

## Executive decision

The project can be distributed as an open-source or commercial CLI if it keeps
the following boundaries:

1. Ship only the project's JavaScript and npm dependencies.
2. Treat Node.js, Quarto, Chrome/Chromium, and FFmpeg as user-installed external
   prerequisites; do not bundle their binaries.
3. Install each local TTS engine in a separate provider environment and fetch
   code, weights, and voice packs directly from the identified upstream
   release. Preserve each artifact's license and provenance beside it.
4. Make Kokoro the default local provider; make Chatterbox and Qwen3-TTS opt-in;
   make ElevenLabs an explicit bring-your-own-key provider. Do not restore
   Piper.
5. Do not enable reference-audio voice cloning without a recorded rights and
   consent declaration. Preserve Chatterbox's PerTh watermark and disclose
   synthetic/cloned narration in exported provenance.

The project now carries Apache-2.0, including its express patent grant, plus a
NOTICE and third-party notices. `package.json` remains marked `private`
until the provider installers and release gates described below are complete.

The package and CLI identity is now `basa-video`; the former
Quarto-based product identity has been removed. Posit's policy allows
descriptive compatibility statements and unrestricted use of “QMD”. Keep
wording such as “compatible with Quarto and Reveal.js,” and do not use the
Quarto logo as product branding.[27]

## Distribution boundary

| Category | Items | Compliance consequence |
|---|---|---|
| Shipped npm package | Project JavaScript, `puppeteer-core`, `yaml`, and locked transitive npm dependencies | Include the project license and third-party license/notice inventory. |
| External prerequisites | Node.js, Quarto CLI, Chrome or Chromium, FFmpeg/FFprobe | Detect and invoke them. Link to official installation instructions. Do not copy their binaries into npm releases or installers. |
| Setup-downloaded local providers | Kokoro code, model weights and voices; optional Chatterbox/PerTh; optional Qwen3-TTS | Download from pinned upstream URLs into provider-specific caches; show source, version, size, license, checksum, and terms before download; retain license/model card files. |
| Hosted provider | ElevenLabs API | No ElevenLabs software or weights are redistributed. The user remains responsible for the account, plan, selected voice, input rights, output use, and current terms. |
| User content | QMD/HTML, images, fonts, scripts, notes, reference voices, generated audio/video | The user must own or license all inputs. The renderer must not imply that model/code licenses clear content, performer, personality, trademark, or privacy rights. |

## Current runtime and dependencies

### npm package

The current lockfile contains 25 runtime packages. Its recorded licenses are
Apache-2.0, BSD-3-Clause, MIT, or ISC; no copyleft dependency is presently
inside the npm dependency graph. `puppeteer-core` is Apache-2.0 and `yaml` is
ISC.[1][2] Apache-2.0 redistribution requires a copy of the license, retention
of relevant notices, marking modified files, and preservation of an upstream
`NOTICE` file when one exists. MIT, ISC, and BSD packages require their
copyright/license notices to be retained.

Release automation should generate notices from the exact lockfile rather than
maintain a handwritten list. Fail release CI when a dependency has missing or
unapproved license metadata. Do not assume the direct-dependency list covers
the transitive graph.

### Quarto and Reveal.js

Quarto 1.4 and later is MIT-licensed, and its FAQ says a user's original output
content is not brought under Quarto's license; embedded Quarto styles and
functionality remain covered by their own licenses.[4][5] Reveal.js is
MIT-licensed.[6] Keeping Quarto as an external executable is therefore both
simple and compatible with proprietary presentations. If the product later
packages Quarto or Reveal.js assets itself, include their license notices in
that distribution.

### Browser

`puppeteer-core` does not itself make Google Chrome part of this distribution.
Keep browser discovery pointed at a user-installed Chrome or Chromium. Chromium
has a BSD-style top-level license and many separately licensed third-party
components; binary redistribution would require its complete accompanying
notices.[7] Google Chrome is a separately branded product governed by Google's
terms, so the installer must not download or redistribute Chrome on the
project's behalf without a separate review.[8]

### FFmpeg and codecs

FFmpeg is LGPL-2.1-or-later by default, but builds that enable GPL components
are GPL-2.0-or-later; `--enable-nonfree` builds are not redistributable.[3] The
Ubuntu FFmpeg currently used during development reports `--enable-gpl` and
`--enable-libx264`, so that binary is a GPL build. Invoking the user's installed
executable and shipping only the rendered MP4 keeps this binary outside the npm
distribution. Do not copy that binary into a release.

If a future installer bundles FFmpeg, pin and audit the exact build, publish
its corresponding source/build configuration, license text, notices and any
changes, and review codec-patent exposure in intended countries. Prefer a
system-package installation instruction over bundling.

## TTS provider matrix

| Provider/artifact | Upstream license or terms | Ship status | Required handling |
|---|---|---|---|
| Kokoro official inference library | Apache-2.0[11] | Downloaded default | Pin version; retain license/NOTICE and source URL. |
| Kokoro-82M weights and official voice packs | Model repository declares Apache-2.0[9][10] | Downloaded default | Pin model revision and hashes; retain model card and voice inventory; record exact voice ID. |
| `kokoro-onnx` alternative runtime | MIT code; its documentation identifies Kokoro model as Apache-2.0[12] | Optional implementation choice | Pin the runtime and model release independently; retain both licenses. |
| Misaki G2P | Apache-2.0[13] | Kokoro dependency | Preserve license and audit its language-specific optional dependencies. |
| eSpeak NG fallback | GPL-3.0-or-later[14] | Optional external/provider dependency | Do not bundle or link it into the npm package. Install separately only when required and disclose the GPL dependency. Prefer Kokoro paths that do not require it for the default English demonstration. |
| Chatterbox code and official weights | MIT[15][16] | Opt-in local provider | Pin code and model revisions; retain MIT notice and model card. |
| PerTh watermarking | MIT package metadata[17] | Chatterbox dependency | Preserve the upstream watermark in generated Chatterbox audio and record detection/provenance metadata. Do not offer a “remove watermark” option. |
| Qwen3-TTS package and official checkpoints | Apache-2.0[18][19] | Opt-in local provider | Pin package and each selected checkpoint separately; retain licenses/model cards and hashes. |
| ElevenLabs | EEA Terms, service-specific terms, voice-library terms, and use policy | BYO API key only | Never auto-select based on key presence. Show account-plan and output-use warning before first use. Do not resell or expose the service to third parties without reviewing OEM terms. |

### Model license is not a blanket voice-rights warranty

The official Kokoro repository applies Apache-2.0 to the model repository and
lists the official voices, including CC-BY training-source annotations for some
Japanese voices and the French `ff_siwis` voice.[9][10] It does not provide a
separate publicity/personality-rights warranty for every named voice. Keep the
official voice ID, model revision, declared model license, and any listed
attribution in the manifest; do not market a voice as an imitation of a named
person or as culturally “authentic” beyond upstream metadata.

Chatterbox's official model is MIT-licensed and performs zero-shot cloning from
a supplied audio prompt.[16] The MIT grant covers the released code/model; it
does not grant rights in the user's reference recording or the speaker's
identity. The same separation applies to Qwen3-TTS. Its official checkpoint is
Apache-2.0, but the model card does not state separate performer/timbre grants
for every built-in preset.[19] Consequently, the product must maintain a
per-voice registry rather than infer that all voices under one engine have the
same provenance. Do not add community voice packs until their source recording,
speaker authorization, license, attribution, and commercial-use scope have all
been documented.

### ElevenLabs output rules

For an EEA user, ElevenLabs' current terms allow free users only non-commercial
use and paid users commercial use, subject in both cases to its prohibited-use
policy.[20] ElevenLabs' official publishing guidance additionally requires
attribution for free-plan output and says paid-plan output retains its
commercial license after the subscription ends, while Beta Services are not
cleared for commercial or production use.[21] The integration must therefore:

- require explicit `--provider elevenlabs` selection;
- never infer commercial rights merely from a working API key;
- display and record a user declaration of free/paid/enterprise plan at
  generation time;
- mark free-plan output `non-commercial` and surface the required attribution;
- record the provider, model, voice ID, timestamp, plan declaration, text hash,
  and terms URLs in the render manifest; and
- avoid claiming ownership or exclusivity in output—the EEA terms say the user
  retains rights as between the user and ElevenLabs but warn that output may not
  be unique.[20]

Voice Library models remain subject to a separate addendum. That addendum says
models may be removed subject to a notice period, while already generated
outputs continue to exist and remain usable.[23] Save rendered audio in the
project cache; never assume a Voice Library ID will remain available forever.

## Voice cloning, consent, privacy, and provenance

Reference audio must be disabled until these controls exist:

1. **Rights gate.** Interactive use requires an affirmative declaration that
   the operator is the speaker or holds written authorization covering voice
   cloning, the intended text, media, audience, commercial status, territory,
   and duration. Non-interactive use should require a consent-record file—not a
   generic `--yes` flag. Hash the record and reference audio in the private
   manifest.
2. **Purpose limitation.** Consent to record a person is not automatically
   consent to synthesize new speech, publish it, advertise with it, or reuse it
   indefinitely. Store the stated permitted uses and stop reuse after expiry or
   revocation.
3. **Privacy by default.** Keep reference recordings local, outside source
   control, with restrictive file permissions. Do not upload them to a cloud
   provider unless the operator explicitly selected that provider and saw its
   data terms. Provide deletion commands for reference audio, embeddings, cached
   speech, and consent metadata.
4. **No high-risk impersonation.** Warn and refuse when the operator disclaims
   authorization. Never provide a bypass for provider verification. ElevenLabs
   requires confirmation of rights/consent for instant cloning and permits a
   Professional Voice Clone only of the user's own voice; another person must
   create and share their verified clone themselves.[22] Its use policy forbids
   unauthorized, deceptive, or harmful impersonation.[24]
5. **Disclosure.** Add “AI-generated narration” to MP4 metadata and the render
   manifest, and support a visible disclosure/caption for cloned voices. EU AI
   Act Article 50 requires deployers to disclose AI-generated/manipulated audio
   that constitutes a deep fake; creative works may use an appropriate
   disclosure that does not hamper enjoyment.[26]

Voice recordings and embeddings are personal data when linked to an identifiable
person. Under GDPR, biometric data is a special category when technical
processing allows or confirms unique identification; processing for that
identification purpose is generally prohibited unless an Article 9 exception,
such as explicit consent, applies.[25] A voice-cloning workflow is not
automatically biometric identification in every use, but it still needs a lawful
basis, transparency, retention limits, security, and data-subject handling. Seek
specialist review before offering hosted cloning, workplace use, minors' voices,
public-figure voices, or cross-border storage.

## Release controls to implement

- Keep the Apache-2.0 license, NOTICE, third-party notices, and temporary
  trademark-safe identity in every source distribution.
- Retain only descriptive “Quarto-compatible” wording and do not use Quarto
  branding as the eventual product identity.[27]
- Generate `THIRD_PARTY_NOTICES.md` and an SBOM from the exact npm lockfile in
  CI; fail on new, unknown, copyleft, non-commercial, or custom licenses.
- Implement `setup` with `--provider kokoro|chatterbox|qwen` and
  `--all-local`; `--all-local` must not include ElevenLabs. Show download size,
  source, revision, SHA-256, license, cache location, and hardware suitability
  before installation.
- Store a license/model-card snapshot and artifact manifest inside each provider
  cache. Download from pinned official release URLs and verify hashes before
  execution.
- Keep TTS provider Python environments isolated from the npm application and
  from one another. Do not copy model weights or external executables into npm
  tarballs.
- Add `voices list` fields for provider, model revision, language/accent as
  declared upstream, voice ID, artifact license, source, attribution, commercial
  status (`allowed`, `restricted`, or `unverified`), and cloning status.
- Refuse commercial mode for ElevenLabs free-plan or Beta output; include the
  required attribution for published free-plan output.[21]
- Preserve PerTh watermarking for Chatterbox and add a provider-neutral
  provenance manifest for every render.[16][17]
- Exclude `.env`, API keys, reference audio, consent records, provider caches,
  voice embeddings, and generated manifests containing personal data from Git.
- Re-run the audit on every provider/model upgrade and before distributing any
  browser, FFmpeg, Python runtime, CUDA library, or model in a packaged installer.

## Open uncertainties requiring a conservative default

- **Kokoro voices:** the repository license is clear, but there is no separate
  rights warranty for every voice identity or training source. Preserve all
  listed attribution and describe voice origin no more specifically than the
  official inventory does.[9][10]
- **Qwen preset voices:** the checkpoint license is Apache-2.0, but separate
  commercial performer/timbre clearance is not stated in the model card. Mark
  built-in presets `commercial: unverified` until Alibaba/Qwen publishes a clear
  grant.[19]
- **Python/CUDA transitive packages:** Chatterbox and Qwen bring large changing
  dependency graphs. The final pinned environment needs its own generated SBOM
  and license scan; the top-level model license is not enough.
- **FFmpeg/codecs:** invoking a system binary is the current safe boundary.
  Bundled FFmpeg and codec-patent questions need a release-specific review.[3]
- **Hosted product:** this report covers a local BYO-key CLI. A web service that
  generates ElevenLabs audio for customers may trigger OEM/resale, privacy,
  consumer, and data-processing obligations not satisfied by this design.[20]

## Sources

[1] https://github.com/puppeteer/puppeteer/blob/main/LICENSE — Puppeteer Apache 2.0 license
[2] https://github.com/eemeli/yaml/blob/main/LICENSE — yaml ISC license
[3] https://ffmpeg.org/legal.html — FFmpeg licensing and legal considerations
[4] https://github.com/quarto-dev/quarto-cli — Quarto CLI repository and license
[5] https://quarto.org/docs/faq — Quarto licensing FAQ
[6] https://github.com/hakimel/reveal.js/blob/master/LICENSE — Reveal.js MIT license
[7] https://chromium.googlesource.com/chromium/chromium/+/refs/heads/main/LICENSE — Chromium BSD-style license
[8] https://www.google.com/chrome/terms — Chrome and ChromeOS Additional Terms
[9] https://huggingface.co/hexgrad/Kokoro-82M — Kokoro-82M model card
[10] https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md — Kokoro official voice inventory
[11] https://github.com/hexgrad/kokoro/blob/main/LICENSE — Kokoro inference library Apache 2.0 license
[12] https://github.com/thewh1teagle/kokoro-onnx — kokoro-onnx repository and licensing
[13] https://github.com/hexgrad/misaki — Misaki G2P repository and license
[14] https://github.com/espeak-ng/espeak-ng — eSpeak NG repository and GPL license
[15] https://github.com/resemble-ai/chatterbox/blob/master/LICENSE — Chatterbox MIT license
[16] https://huggingface.co/ResembleAI/chatterbox — Official Chatterbox model card
[17] https://github.com/resemble-ai/Perth/blob/master/pyproject.toml — PerTh package metadata and MIT license
[18] https://github.com/QwenLM/Qwen3-TTS/blob/main/LICENSE — Qwen3-TTS Apache 2.0 license
[19] https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice — Qwen3-TTS CustomVoice model card
[20] https://elevenlabs.io/terms-of-use-eu — ElevenLabs EEA Terms of Service
[21] https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform — ElevenLabs publishing and commercial-use rules
[22] https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning — ElevenLabs voice cloning documentation
[23] https://elevenlabs.io/vlaeu — ElevenLabs EEA Voice Library Addendum
[24] https://elevenlabs.io/use-policy — ElevenLabs Prohibited Use Policy
[25] https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32016R0679 — EU General Data Protection Regulation
[26] https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en — EU Artificial Intelligence Act
[27] https://quarto.org/trademark.html — Quarto trademark policy
