# Product direction

## Identity

**Basa** is the umbrella brand, named for the Berom word for “teach.”

**Basa Video** is the current product. Its package, executable and repository
working name are `basa-video`.

This naming keeps the brand independent of any one authoring format or vendor.
Quarto, Reveal.js and future formats are compatibility targets, not product
identity.

## Lean scope

The current product contract is intentionally narrow:

1. Accept a QMD presentation or Reveal.js HTML containing speaker notes.
2. Generate narration for each slide.
3. Measure the real audio duration.
4. Keep the corresponding slide visible for that duration.
5. Export an MP4, captions and a provenance manifest.

Support for other presentation or document formats is future work. When added,
each format should normalize into the same internal slide model rather than
introducing a separate rendering pipeline.
