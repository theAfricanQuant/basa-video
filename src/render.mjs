import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { buildSrt, parseFrontMatter, probeDuration, renderInput, run, saveJson, splitVoice } from "./lib.mjs";
import { assertVoiceProviderReady, synthesizeMany } from "./voices.mjs";
import { assertProviderTerms, buildProviderProvenance, loadVoiceRightsProvenance } from "./legal.mjs";
import { assertRenderToolchain } from "./toolchain.mjs";

function number(value, fallback) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

export async function renderVideo(input, cli = {}) {
  const voiceRights = await loadVoiceRightsProvenance(cli);
  const inputPath = resolve(input);
  const preliminaryConfig = extname(inputPath).toLowerCase() === ".qmd"
    ? parseFrontMatter(await readFile(inputPath, "utf8"))
    : {};
  const preliminaryVideo = preliminaryConfig.video ?? {};
  const preliminaryVoice = splitVoice(cli.voice || preliminaryVideo.voice, cli.provider || preliminaryVideo.provider || "kokoro");
  const preliminaryProvider = cli.provider || preliminaryVoice.provider;
  assertProviderTerms(preliminaryProvider, cli);
  await assertVoiceProviderReady(preliminaryProvider);
  const toolchain = await assertRenderToolchain({ requiresQuarto: extname(inputPath).toLowerCase() === ".qmd" });

  const root = cli.work_dir ? resolve(cli.work_dir) : join(dirname(inputPath), ".basa-video");
  const workDir = join(root, basename(input, extname(input)));
  const framesDir = join(workDir, "frames"), audioDir = join(workDir, "audio"), segmentsDir = join(workDir, "segments");
  await Promise.all([mkdir(framesDir, { recursive: true }), mkdir(audioDir, { recursive: true }), mkdir(segmentsDir, { recursive: true })]);
  const { htmlPath, config, quartoExecutable = null, quartoVersion = null } = await renderInput(input, workDir);
  const video = config.video ?? {};
  const configured = splitVoice(cli.voice || video.voice, cli.provider || video.provider || "kokoro");
  const provider = cli.provider || configured.provider;
  assertProviderTerms(provider, cli);
  const provenance = { ...buildProviderProvenance(provider, cli), voiceRights };
  const defaultVoice = configured.voice;
  const language = cli.language || video.language || "en";
  const width = number(cli.width || video.width, 1920), height = number(cli.height || video.height, 1080), fps = number(cli.fps || video.fps, 30);
  const lead = number(cli.lead || video["pause-before-slide"], 0.3), trail = number(cli.trail || video["pause-after-slide"], 0.7);
  const speed = number(cli.speed || video.speed, 1);
  const device = cli.device || video.device;
  const output = resolve(cli.output || `${basename(input, extname(input))}.mp4`);
  const browserPath = cli.browser || toolchain.browser;

  console.log(`[1/6] Opening Reveal.js deck: ${htmlPath}`);
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ["--no-sandbox", "--allow-file-access-from-files", `--window-size=${width},${height}`] });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0", timeout: 120000 });
  await page.waitForFunction(() => globalThis.Reveal?.isReady?.(), { timeout: 30000 });
  const slides = await page.evaluate(() => globalThis.Reveal.getSlides().map((element, index) => {
    const indices = globalThis.Reveal.getIndices(element);
    const notesElement = element.querySelector("aside.notes");
    const narration = notesElement?.cloneNode(true);
    narration?.querySelectorAll("script, style, noscript, template, [aria-hidden=\"true\"]").forEach(node => node.remove());
    return { index, h: indices.h, v: indices.v ?? 0, title: element.querySelector("h1,h2,h3")?.textContent?.trim() || `Slide ${index + 1}`, notes: narration?.innerText?.trim() || "", voice: element.dataset.voice || "" };
  }));
  if (slides[0] && !slides[0].notes && video["title-slide-notes"]) slides[0].notes = String(video["title-slide-notes"]);
  const missing = slides.filter(slide => !slide.notes);
  if (missing.length) { await browser.close(); throw new Error(`Missing speaker notes on slide(s): ${missing.map(s => `${s.index + 1} (${s.title})`).join(", ")}`); }
  console.log(`[2/6] Found ${slides.length} narrated slides`);

  for (const slide of slides) {
    const frame = join(framesDir, `slide-${String(slide.index + 1).padStart(3, "0")}.png`);
    await page.evaluate(({ h, v }) => { globalThis.Reveal.configure({ transition: "none", backgroundTransition: "none" }); globalThis.Reveal.slide(h, v, -1); }, slide);
    await new Promise(resolvePromise => setTimeout(resolvePromise, 120));
    await page.screenshot({ path: frame });
    slide.frame = frame;
  }
  await browser.close();

  console.log(`[3/6] Generating narration with ${provider}`);
  const narrationRequests = slides.map(slide => {
    const selected = splitVoice(slide.voice || `${provider}:${defaultVoice ?? ""}`, provider);
    assertProviderTerms(selected.provider, cli);
    slide.provider = selected.provider;
    return { provider: selected.provider, voice: selected.voice, model: cli.model || video.model, language, text: slide.notes, cacheDir: audioDir, speed, device, force: Boolean(cli.force_audio) };
  });
  const narrationResults = await synthesizeMany(narrationRequests);
  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index], result = narrationResults[index];
    slide.audio = result.path; slide.audioCached = result.cached; slide.voice = result.voice; slide.model = result.model; slide.modelRevision = result.modelRevision; slide.audioDuration = await probeDuration(result.path);
    console.log(`  slide ${slide.index + 1}: ${slide.audioDuration.toFixed(2)}s${result.cached ? " (cached)" : ""}`);
  }

  console.log("[4/6] Encoding slide segments");
  for (const slide of slides) {
    const segment = join(segmentsDir, `slide-${String(slide.index + 1).padStart(3, "0")}.mp4`);
    const total = lead + slide.audioDuration + trail;
    await run(toolchain.ffmpeg, ["-y", "-loglevel", "error", "-loop", "1", "-framerate", String(fps), "-i", slide.frame, "-i", slide.audio, "-filter_complex", `[1:a]adelay=${Math.round(lead * 1000)}:all=1,apad=pad_dur=${trail}[a]`, "-map", "0:v", "-map", "[a]", "-t", String(total), "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`, "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", "-ac", "2", segment]);
    slide.segment = segment;
  }

  console.log("[5/6] Concatenating and writing captions");
  const concatPath = join(workDir, "segments.txt");
  await writeFile(concatPath, slides.map(slide => `file '${slide.segment.replaceAll("'", "'\\''")}'`).join("\n"));
  await mkdir(dirname(output), { recursive: true });
  await run(toolchain.ffmpeg, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", concatPath, "-c", "copy", "-metadata", `comment=AI-generated narration; provider=${provider}`, "-movflags", "+faststart", output]);
  const srt = output.replace(/\.mp4$/i, ".srt");
  await writeFile(srt, buildSrt(slides, lead, trail));
  await saveJson(join(workDir, "manifest.json"), { input: resolve(input), htmlPath, output, provider, language, width, height, fps, lead, trail, speed, device: device || null, quartoExecutable, quartoVersion, toolchain, provenance, slides });
  console.log(`[6/6] Done\nVideo: ${output}\nCaptions: ${srt}\nManifest: ${join(workDir, "manifest.json")}`);
  return { output, srt, slides };
}
