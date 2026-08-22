import { secondsToSrt } from "./lib.mjs";

function finiteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

export function segmentCaptionText(text, { maxChars = 48, maxWords = 8 } = {}) {
  const charLimit = Math.max(16, Math.round(finiteNumber(maxChars, 48)));
  const wordLimit = Math.max(3, Math.round(finiteNumber(maxWords, 8)));
  const words = normalizeText(text).split(" ").filter(Boolean);
  const phrases = [];
  let phrase = [];

  for (const word of words) {
    const candidate = [...phrase, word].join(" ");
    if (phrase.length && (phrase.length >= wordLimit || candidate.length > charLimit)) {
      phrases.push(phrase.join(" "));
      phrase = [word];
    } else {
      phrase.push(word);
    }

    if (phrase.length >= 3 && /[.!?;:]$/.test(word)) {
      phrases.push(phrase.join(" "));
      phrase = [];
    }
  }
  if (phrase.length) phrases.push(phrase.join(" "));
  for (let index = phrases.length - 1; index > 0; index -= 1) {
    const current = phrases[index].split(" ");
    const previous = phrases[index - 1].split(" ");
    while (current.length < 3 && previous.length > 3) {
      const candidate = [previous.at(-1), ...current].join(" ");
      if (candidate.length > charLimit) break;
      current.unshift(previous.pop());
    }
    phrases[index - 1] = previous.join(" ");
    phrases[index] = current.join(" ");
  }
  return phrases;
}

function speechWeight(text) {
  const spoken = (text.match(/[\p{L}\p{N}]+/gu) || []).reduce((total, word) => total + Math.max(1, word.length), 0);
  const pause = (text.match(/[,;:]/g) || []).length * 2 + (text.match(/[.!?]/g) || []).length * 4;
  return Math.max(1, spoken + pause);
}

export function buildCaptionCues(slides, { lead = 0.3, trail = 0.7, maxChars = 48, maxWords = 8 } = {}) {
  const cues = [];
  let cursor = 0;
  for (const slide of slides) {
    const phrases = segmentCaptionText(slide.notes, { maxChars, maxWords });
    const duration = finiteNumber(slide.audioDuration, 0);
    const weights = phrases.map(speechWeight);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let elapsed = 0;
    phrases.forEach((text, index) => {
      const start = cursor + finiteNumber(lead, 0.3) + elapsed;
      const phraseDuration = index === phrases.length - 1
        ? duration - elapsed
        : duration * weights[index] / totalWeight;
      elapsed += phraseDuration;
      cues.push({ start, end: cursor + finiteNumber(lead, 0.3) + elapsed, text, slide: slide.index ?? 0 });
    });
    cursor += finiteNumber(lead, 0.3) + duration + finiteNumber(trail, 0.7);
  }
  return cues;
}

function secondsToAss(value) {
  const centiseconds = Math.max(0, Math.round(value * 100));
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor((centiseconds % 360000) / 6000);
  const seconds = Math.floor((centiseconds % 6000) / 100);
  const fraction = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
}

function escapeAss(text) {
  return text.replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}");
}

export function buildCaptionFiles(slides, options = {}) {
  const cues = buildCaptionCues(slides, options);
  const width = Math.max(320, Math.round(finiteNumber(options.width, 1920)));
  const height = Math.max(240, Math.round(finiteNumber(options.height, 1080)));
  const fontSize = Math.max(18, Math.round(finiteNumber(options.fontSize, 34)));
  const marginV = Math.max(12, Math.round(finiteNumber(options.marginV, 30)));
  const srt = cues.map((cue, index) => `${index + 1}\n${secondsToSrt(cue.start)} --> ${secondsToSrt(cue.end)}\n${cue.text}\n`).join("\n");
  const events = cues.map(cue => `Dialogue: 0,${secondsToAss(cue.start)},${secondsToAss(cue.end)},Basa,,0,0,0,,${escapeAss(cue.text)}`).join("\n");
  const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Basa,Arial,${fontSize},&H00FFFFFF,&H000000FF,&HB00000000,&H70000000,0,0,0,0,100,100,0,0,1,2,0,2,50,50,${marginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events}\n`;
  return { cues, srt, ass };
}
