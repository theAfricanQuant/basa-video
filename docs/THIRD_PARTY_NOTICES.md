# Third-party notices

This inventory separates code distributed with Basa Video from external tools
and models obtained independently by the user. It must be reviewed before
every release.

## Distributed npm dependencies

- Puppeteer Core and its browser-protocol dependencies: Apache-2.0, BSD-3-Clause,
  ISC and MIT components. Source: https://github.com/puppeteer/puppeteer
- yaml: ISC. Source: https://github.com/eemeli/yaml

Run `npm run check:licenses` against the locked dependency tree before a
release. Required copyright and license texts remain in each installed npm
package. A published binary or container needs generated notices/SBOM output,
not only this summary.

## External prerequisites

These are invoked from the user system and are not distributed by this npm
package:

- Quarto CLI: MIT. https://github.com/quarto-dev/quarto-cli
- Reveal.js: MIT. https://github.com/hakimel/reveal.js
- FFmpeg/FFprobe: license depends on build configuration. The current Ubuntu
  binary reports GPL-enabled components. Do not redistribute an FFmpeg binary
  until its exact build and corresponding source/notice obligations are
  reviewed. https://ffmpeg.org/legal.html
- Chrome or Chromium: Basa Video automates a user-installed browser. Do not
  redistribute Google Chrome. Prefer Chromium for any future bundled runtime.

## Optional providers and downloaded models

Provider support does not imply that model weights or voices are bundled.

- Kokoro inference runtime 0.9.4, spaCy English model 3.8.0, and Kokoro-82M
  model revision `f3ff3571791e39611d31c381e3a41a3af07b4987`: Apache-2.0
  upstream. Kokoro's dependency tree also installs `espeakng-loader`, which
  supplies eSpeak NG components under GPL-3.0-or-later inside the user's
  isolated provider environment. None of these Python packages, binaries, or
  model files are distributed in the Basa npm package. Setup retains upstream
  licenses/model cards and hashes the installed model and voice artifacts.
  https://github.com/hexgrad/kokoro and
  https://huggingface.co/hexgrad/Kokoro-82M
- Chatterbox code/model: MIT upstream. Preserve its PerTh provenance watermark
  and upstream notices. https://github.com/resemble-ai/chatterbox
- Qwen3-TTS package/checkpoints: use only checkpoints whose own model card
  declares Apache-2.0; pin the exact revision.
  https://github.com/QwenLM/Qwen3-TTS
- ElevenLabs: remote service governed by current account, service-specific and
  prohibited-use terms. No ElevenLabs code or model is distributed.

See MODEL_AND_VOICE_POLICY.md for setup and runtime requirements.
