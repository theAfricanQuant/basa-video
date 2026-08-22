import test from "node:test";
import assert from "node:assert/strict";
import { buildCaptionCues, buildCaptionFiles, segmentCaptionText } from "../src/captions.mjs";

test("segments captions into bounded single-line phrases", () => {
  const phrases = segmentCaptionText("Artificial intelligence becomes more useful as we move from isolated prompts toward systems that complete meaningful work.", { maxChars: 40, maxWords: 7 });
  assert.equal(phrases.length > 1, true);
  assert.equal(phrases.every(phrase => !phrase.includes("\n") && phrase.length <= 40), true);
  assert.equal(phrases.every(phrase => phrase.split(" ").length >= 3), true);
});

test("caption cues fill measured narration and preserve slide pauses", () => {
  const slides = [
    { index: 0, notes: "A short first phrase. Followed by another phrase.", audioDuration: 4 },
    { index: 1, notes: "Second slide.", audioDuration: 2 }
  ];
  const cues = buildCaptionCues(slides, { lead: 0.3, trail: 0.7, maxWords: 4 });
  assert.equal(cues[0].start, 0.3);
  assert.equal(cues.findLast(cue => cue.slide === 0).end, 4.3);
  assert.equal(cues.find(cue => cue.slide === 1).start, 5.3);
  assert.equal(cues.at(-1).end, 7.3);
});

test("caption files include portable SRT and small styled ASS", () => {
  const files = buildCaptionFiles([{ index: 0, notes: "One concise caption line.", audioDuration: 2 }], { fontSize: 30 });
  assert.match(files.srt, /00:00:00,300 --> 00:00:02,300/);
  assert.match(files.ass, /Style: Basa,Arial,30,/);
  assert.equal(files.cues.every(cue => !cue.text.includes("\n")), true);
});
