import test from "node:test";
import assert from "node:assert/strict";
import { hashNarration } from "../src/lib.mjs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { synthesizeMany } from "../src/voices.mjs";
import { KOKORO_MODEL, listKokoroVoices, resolveKokoroLanguage } from "../src/kokoro.mjs";
import { formatKokoroSetupDisclosure, KOKORO_PYTHON_VERSION } from "../src/setup.mjs";

test("Kokoro exposes the complete reviewed official voice inventory", () => {
  const voices = listKokoroVoices();
  assert.equal(voices.length, 54);
  assert.equal(voices.some(voice => voice.id === "af_heart"), true);
  assert.equal(voices.some(voice => voice.id === "bf_emma"), true);
  assert.equal(listKokoroVoices("British").length, 8);
});

test("Kokoro infers English dialect from the selected voice", () => {
  assert.equal(resolveKokoroLanguage("en", "af_heart"), "a");
  assert.equal(resolveKokoroLanguage("en", "bf_emma"), "b");
  assert.throws(() => resolveKokoroLanguage("en-us", "bf_emma"), /not compatible/);
  assert.throws(() => resolveKokoroLanguage("de", "af_heart"), /does not currently support/);
});

test("Kokoro uses an explicitly managed Python version", () => {
  assert.equal(KOKORO_PYTHON_VERSION, "3.12");
  assert.match(formatKokoroSetupDisclosure({ root: "/provider" }), /uv-managed 3.12/);
});

test("Kokoro setup disclosure exposes the immutable model and license", () => {
  const disclosure = formatKokoroSetupDisclosure({ root: "/provider" });
  assert.match(disclosure, new RegExp(KOKORO_MODEL.revision));
  assert.match(disclosure, /Apache-2.0/);
  assert.match(disclosure, /exceed 1 GB/);
});

test("narration cache keys include speech speed", () => {
  const base = { provider: "kokoro", voice: "af_heart", model: KOKORO_MODEL.revision, language: "en", text: "Teach clearly." };
  assert.notEqual(hashNarration({ ...base, speed: 1 }), hashNarration({ ...base, speed: 1.1 }));
});

test("batch narration preserves order and default-voice provenance for cached audio", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "basa-video-batch-"));
  const requests = ["First slide.", "Second slide."].map(text => ({
    provider: "kokoro", language: "en", text, cacheDir, speed: 1
  }));
  for (const request of requests) {
    const key = hashNarration({
      provider: "kokoro", voice: "af_heart", model: KOKORO_MODEL.revision,
      language: "en", text: request.text, speed: 1
    });
    await writeFile(join(cacheDir, `${key}.wav`), "cached");
  }
  const results = await synthesizeMany(requests);
  assert.deepEqual(results.map(result => result.voice), ["af_heart", "af_heart"]);
  assert.equal(results.every(result => result.cached), true);
  assert.equal(results.every(result => result.modelRevision === KOKORO_MODEL.revision), true);
});
