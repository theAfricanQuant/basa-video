import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { capture, exists, run, saveJson } from "./lib.mjs";
import { ensureQuarto, inspectToolchain, QUARTO_VERSION } from "./toolchain.mjs";
import { KOKORO_MODEL, KOKORO_RUNTIME_VERSION, kokoroPaths, SOUNDFILE_VERSION } from "./kokoro.mjs";

const helper = fileURLToPath(new URL("../scripts/kokoro_synthesize.py", import.meta.url));
export const KOKORO_PYTHON_VERSION = "3.12";
export const SPACY_EN_MODEL_VERSION = "3.8.0";
export const SPACY_EN_MODEL_SHA256 = "1932429db727d4bff3deed6b34cfc05df17794f4a52eeb26cf8928f7c1a0fb85";

async function requireUv() {
  try { await capture("uv", ["--version"]); }
  catch { throw new Error("uv is required. Install it from https://docs.astral.sh/uv/ and rerun setup."); }
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function installRuntime(paths, accelerator, recreateRuntime) {
  await requireUv();
  await run("uv", ["python", "install", KOKORO_PYTHON_VERSION]);

  if (recreateRuntime || !await exists(paths.python)) {
    const args = ["venv"];
    if (recreateRuntime) args.push("--clear");
    args.push("--managed-python", "--python", KOKORO_PYTHON_VERSION, paths.venv);
    await run("uv", args);
  }

  if (!await exists(paths.python)) throw new Error("uv did not create the Kokoro provider environment.");
  const spacyModel = `en-core-web-sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-${SPACY_EN_MODEL_VERSION}/en_core_web_sm-${SPACY_EN_MODEL_VERSION}-py3-none-any.whl#sha256=${SPACY_EN_MODEL_SHA256}`;
  const packages = [`kokoro==${KOKORO_RUNTIME_VERSION}`, `soundfile==${SOUNDFILE_VERSION}`, spacyModel];
  const torchBackend = accelerator === "cpu" ? "cpu" : "auto";
  await run("uv", ["pip", "install", "--python", paths.python, "--torch-backend", torchBackend, ...packages]);
  await capture("uv", ["run", "--no-project", "--python", paths.python, "python", "-c", "import spacy; spacy.load('en_core_web_sm')"]);
}

export function formatKokoroSetupDisclosure(paths = kokoroPaths()) {
  return [
    "Kokoro local provider",
    `Python: uv-managed ${KOKORO_PYTHON_VERSION}`,
    `Runtime: kokoro==${KOKORO_RUNTIME_VERSION}, soundfile==${SOUNDFILE_VERSION}`,
    `English G2P: en-core-web-sm==${SPACY_EN_MODEL_VERSION} (SHA-256 pinned)`,
    `Quarto: existing installation or official quarto-cli==${QUARTO_VERSION} through uv tool`,
    `Model: ${KOKORO_MODEL.id}@${KOKORO_MODEL.revision}`,
    `License: ${KOKORO_MODEL.license}`,
    `Source: ${KOKORO_MODEL.source}`,
    `Install location: ${paths.root}`,
    "Download: several hundred MB; Python/PyTorch dependencies can exceed 1 GB.",
    "Accelerator: CPU by default; use --accelerator auto for uv hardware detection.",
    "Voice/model licensing does not grant rights to imitate a real person."
  ].join("\n");
}

export async function setupProvider(options = {}) {
  const provider = options.provider || "kokoro";
  if (options.all) throw new Error("--all will be enabled when Chatterbox and Qwen adapters ship; the lean release currently installs Kokoro only.");
  if (provider !== "kokoro") throw new Error(`Provider setup is not implemented yet: ${provider}`);

  const paths = kokoroPaths();
  console.log(formatKokoroSetupDisclosure(paths));
  if (!options.accept_model_license) {
    throw new Error("Review the disclosure, then rerun with --accept-model-license.");
  }

  await mkdir(paths.root, { recursive: true });
  const accelerator = String(options.accelerator || "cpu");
  if (!["cpu", "auto"].includes(accelerator)) throw new Error("--accelerator must be cpu or auto");
  console.log("\n[1/4] Installing isolated Kokoro runtime with uv");
  await installRuntime(paths, accelerator, Boolean(options.recreate_runtime));

  console.log("[2/4] Ensuring Quarto is available");
  const quartoExecutable = await ensureQuarto({ pythonVersion: KOKORO_PYTHON_VERSION });
  const quartoVersion = (await capture(quartoExecutable, ["--version"])).trim();

  console.log("[3/4] Downloading pinned model, voices, and upstream notices");
  await run(paths.python, [
    helper,
    "--download-only",
    "--model-dir", paths.modelDir,
    "--revision", KOKORO_MODEL.revision
  ]);

  console.log("[4/4] Recording exact installed artifacts");
  const modelPath = join(paths.modelDir, "kokoro-v1_0.pth");
  const voicesDir = join(paths.modelDir, "voices");
  const voiceFiles = (await readdir(voicesDir)).filter(name => name.endsWith(".pt")).sort();
  const voices = [];
  for (const name of voiceFiles) voices.push({ id: name.replace(/\.pt$/, ""), sha256: await sha256(join(voicesDir, name)) });
  const freeze = await capture("uv", ["pip", "freeze", "--python", paths.python]);
  await writeFile(paths.requirements, freeze);
  await saveJson(paths.modelRecord, {
    provider: "kokoro",
    artifactId: KOKORO_MODEL.id,
    revision: KOKORO_MODEL.revision,
    sourceUrl: KOKORO_MODEL.source,
    sha256: await sha256(modelPath),
    licenseSpdx: KOKORO_MODEL.license,
    licenseUrl: "https://huggingface.co/hexgrad/Kokoro-82M/blob/main/LICENSE",
    commercialUseAllowed: true,
    redistributionAllowed: true,
    attributionRequired: false,
    voiceType: "built-in",
    reviewedAt: "2026-08-22",
    notes: "Model-repository license does not separately warrant performer, personality, privacy, or publicity rights."
  });
  await saveJson(paths.record, {
    provider: "kokoro",
    environmentManager: "uv",
    pythonVersion: KOKORO_PYTHON_VERSION,
    runtimeVersion: KOKORO_RUNTIME_VERSION,
    spacyEnglishModel: { version: SPACY_EN_MODEL_VERSION, sha256: SPACY_EN_MODEL_SHA256 },
    model: KOKORO_MODEL,
    installedAt: new Date().toISOString(),
    acceptedModelLicense: true,
    accelerator,
    python: paths.python,
    quartoExecutable,
    quartoVersion,
    toolchain: await inspectToolchain(),
    voices
  });
  console.log(`Kokoro is ready. Default voice: ${KOKORO_MODEL.defaultVoice}`);
  return paths;
}
