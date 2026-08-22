import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { exists, hashNarration, run } from "./lib.mjs";
import {
  KOKORO_MODEL,
  kokoroPaths,
  listKokoroVoices,
  resolveKokoroLanguage
} from "./kokoro.mjs";

const ELEVEN_BASE = "https://api.elevenlabs.io";
const kokoroHelper = fileURLToPath(new URL("../scripts/kokoro_synthesize.py", import.meta.url));

function apiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is required for the ElevenLabs provider");
  return key;
}

export { listKokoroVoices };

export async function listElevenLabsVoices(search = "") {
  const url = new URL(`${ELEVEN_BASE}/v2/voices`);
  url.searchParams.set("page_size", "100");
  url.searchParams.set("include_total_count", "false");
  if (search) url.searchParams.set("search", search);
  const response = await fetch(url, { headers: { "xi-api-key": apiKey() } });
  if (!response.ok) throw new Error(`ElevenLabs voice lookup failed (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.voices.map(voice => ({
    provider: "elevenlabs", id: voice.voice_id, name: voice.name,
    accent: voice.labels?.accent ?? "", language: voice.labels?.language ?? voice.verified_languages?.[0]?.language ?? "",
    locale: voice.verified_languages?.[0]?.locale ?? "", category: voice.category ?? voice.type ?? "",
    preview: voice.preview_url ?? voice.verified_languages?.[0]?.preview_url ?? ""
  }));
}

export async function assertVoiceProviderReady(provider) {
  if (provider === "elevenlabs") {
    apiKey();
    return;
  }
  if (provider !== "kokoro") throw new Error(`Unknown voice provider: ${provider}`);
  const paths = kokoroPaths();
  if (!await exists(paths.python) || !await exists(paths.record)) {
    throw new Error("Kokoro is not installed. Run: basa-video setup --accept-model-license");
  }
  const record = JSON.parse(await readFile(paths.record, "utf8"));
  if (record.environmentManager !== "uv" || record.model?.revision !== KOKORO_MODEL.revision) {
    throw new Error("The installed Kokoro environment is not approved. Rerun: basa-video setup --recreate-runtime --accept-model-license");
  }
}

function planNarration({ provider, voice, model, language, text, cacheDir, speed = 1, device, force = false }) {
  const numericSpeed = Number(speed);
  if (!Number.isFinite(numericSpeed) || numericSpeed <= 0) throw new Error("--speed must be a positive number");
  const selectedVoice = provider === "kokoro" ? (voice || KOKORO_MODEL.defaultVoice) : voice;
  const effectiveModel = provider === "kokoro" ? KOKORO_MODEL.revision : (model || "eleven_multilingual_v2");
  const extension = provider === "kokoro" ? "wav" : "mp3";
  const key = hashNarration({ provider, voice: selectedVoice, model: effectiveModel, language, text, speed: numericSpeed });
  return {
    provider, voice: selectedVoice, model: effectiveModel, language, text, cacheDir,
    speed: numericSpeed, device, force, key, output: join(cacheDir, `${key}.${extension}`)
  };
}

function resultForPlan(plan, cached) {
  return {
    path: plan.output,
    cached,
    voice: plan.voice,
    model: plan.provider === "kokoro" ? KOKORO_MODEL.id : plan.model,
    modelRevision: plan.provider === "kokoro" ? KOKORO_MODEL.revision : undefined
  };
}

async function runKokoroBatch(plans) {
  if (!plans.length) return;
  await assertVoiceProviderReady("kokoro");
  const paths = kokoroPaths();
  const device = plans[0].device;
  if (plans.some(plan => plan.device !== device)) throw new Error("A Kokoro batch must use one device.");
  const items = plans.map(plan => ({
    text: plan.text,
    voice: plan.voice,
    langCode: resolveKokoroLanguage(plan.language, plan.voice),
    output: plan.output,
    speed: plan.speed
  }));
  const args = [kokoroHelper, "--batch-json", "--model-dir", paths.modelDir];
  if (device) args.push("--device", device);
  await run(paths.python, args, {
    input: JSON.stringify({ items }),
    env: { HF_HOME: join(paths.root, "hf-cache") }
  });
}

async function synthesizeElevenLabs(plan) {
  if (!plan.voice) throw new Error("An ElevenLabs voice ID is required");
  const response = await fetch(`${ELEVEN_BASE}/v1/text-to-speech/${encodeURIComponent(plan.voice)}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
    body: JSON.stringify({ text: plan.text, model_id: plan.model })
  });
  if (!response.ok) throw new Error(`ElevenLabs synthesis failed (${response.status}): ${await response.text()}`);
  const data = await response.json();
  await writeFile(plan.output, Buffer.from(data.audio_base64, "base64"));
  await writeFile(join(plan.cacheDir, `${plan.key}.alignment.json`), JSON.stringify(data.alignment ?? {}, null, 2));
}

export async function synthesizeMany(requests) {
  const plans = requests.map(planNarration);
  const results = new Array(plans.length);
  const pendingKokoro = [];

  for (let index = 0; index < plans.length; index += 1) {
    const plan = plans[index];
    if (!plan.force && await exists(plan.output)) {
      results[index] = resultForPlan(plan, true);
    } else if (plan.provider === "kokoro") {
      pendingKokoro.push({ index, plan });
    } else if (plan.provider === "elevenlabs") {
      await synthesizeElevenLabs(plan);
      results[index] = resultForPlan(plan, false);
    } else {
      throw new Error(`Unknown voice provider: ${plan.provider}`);
    }
  }

  await runKokoroBatch(pendingKokoro.map(item => item.plan));
  for (const item of pendingKokoro) results[item.index] = resultForPlan(item.plan, false);
  return results;
}

export async function synthesize(request) {
  return (await synthesizeMany([request]))[0];
}
