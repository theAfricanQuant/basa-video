#!/usr/bin/env node
import { parseArgs } from "./lib.mjs";
import { formatProviderNotices } from "./legal.mjs";
import { renderVideo } from "./render.mjs";
import { setupProvider } from "./setup.mjs";
import { listElevenLabsVoices, listKokoroVoices } from "./voices.mjs";
import { printDoctor } from "./toolchain.mjs";

function help() {
  console.log(`basa-video

Usage:
  basa-video setup [--provider kokoro] [--accelerator cpu|auto] [--recreate-runtime] [--accept-model-license]
  basa-video render <deck.qmd|deck.html> [--output deck.mp4] [--provider kokoro|elevenlabs] [--voice ID]
  basa-video voices [--provider kokoro|elevenlabs] [--search TEXT]
  basa-video licenses
  basa-video doctor

Kokoro is the free local default. First run:
  basa-video setup --accept-model-license

Render options: --language en --speed 1 --device cpu|cuda|mps --model MODEL --lead 0.3 --trail 0.7 --width 1920 --height 1080 --fps 30 --force-audio
Captions: --caption-max-chars 48 --caption-max-words 8 --caption-font-size 34 --caption-margin 30
ElevenLabs: --elevenlabs-plan free|paid|enterprise [--commercial]
Reference voices: --reference-audio FILE --voice-rights-record FILE --confirm-voice-rights`);
}

try {
  const { command, input, options } = parseArgs(process.argv.slice(2));
  if (command === "render" && input) await renderVideo(input, options);
  else if (command === "setup") await setupProvider(options);
  else if (command === "licenses") console.log(formatProviderNotices());
  else if (command === "doctor") { if (!await printDoctor()) process.exitCode = 1; }
  else if (command === "voices") {
    const provider = options.provider || "kokoro";
    const search = options.search || input || "";
    const voices = provider === "elevenlabs"
      ? await listElevenLabsVoices(search)
      : provider === "kokoro"
        ? listKokoroVoices(search)
        : (() => { throw new Error(`Unknown voice provider: ${provider}`); })();
    console.table(voices.map(({ preview, ...voice }) => voice));
  } else { help(); process.exitCode = command ? 1 : 0; }
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
