import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, parseFrontMatter, secondsToSrt, splitVoice } from "../src/lib.mjs";

test("parses video settings from QMD front matter", () => {
  const config = parseFrontMatter("---\ntitle: Demo\nvideo:\n  language: en\n  voice: kokoro:af_heart\n---\n# Slide");
  assert.equal(config.video.language, "en"); assert.equal(config.video.voice, "kokoro:af_heart");
});

test("parses CLI options and voice references", () => {
  assert.deepEqual(parseArgs(["render", "deck.qmd", "--fps", "24", "--force-audio"]), { command: "render", input: "deck.qmd", options: { fps: "24", force_audio: true } });
  assert.deepEqual(splitVoice("elevenlabs:abc"), { provider: "elevenlabs", voice: "abc" });
  assert.deepEqual(parseArgs(["voices", "--provider", "kokoro"]), { command: "voices", input: undefined, options: { provider: "kokoro" } });
});

test("formats SRT timestamps", () => {
  assert.equal(secondsToSrt(61.234), "00:01:01,234");
});
