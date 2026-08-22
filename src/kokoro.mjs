import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const KOKORO_RUNTIME_VERSION = "0.9.4";
export const SOUNDFILE_VERSION = "0.14.0";
export const KOKORO_MODEL = Object.freeze({
  id: "hexgrad/Kokoro-82M",
  revision: "f3ff3571791e39611d31c381e3a41a3af07b4987",
  license: "Apache-2.0",
  source: "https://huggingface.co/hexgrad/Kokoro-82M",
  defaultVoice: "af_heart"
});

const GROUPS = [
  ["a", "en-US", "American English", ["af_heart", "af_alloy", "af_aoede", "af_bella", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky", "am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx", "am_puck", "am_santa"]],
  ["b", "en-GB", "British English", ["bf_alice", "bf_emma", "bf_isabella", "bf_lily", "bm_daniel", "bm_fable", "bm_george", "bm_lewis"]],
  ["e", "es", "Spanish", ["ef_dora", "em_alex", "em_santa"]],
  ["f", "fr-FR", "French", ["ff_siwis"]],
  ["h", "hi", "Hindi", ["hf_alpha", "hf_beta", "hm_omega", "hm_psi"]],
  ["i", "it", "Italian", ["if_sara", "im_nicola"]],
  ["j", "ja", "Japanese", ["jf_alpha", "jf_gongitsune", "jf_nezumi", "jf_tebukuro", "jm_kumo"]],
  ["p", "pt-BR", "Brazilian Portuguese", ["pf_dora", "pm_alex", "pm_santa"]],
  ["z", "zh", "Mandarin Chinese", ["zf_xiaobei", "zf_xiaoni", "zf_xiaoxiao", "zf_xiaoyi", "zm_yunjian", "zm_yunxi", "zm_yunxia", "zm_yunyang"]]
];

const ATTRIBUTION = Object.freeze({
  ff_siwis: "SIWIS speech corpus attribution applies; see the official VOICES.md.",
  jf_gongitsune: "Training-source attribution applies; see the official VOICES.md.",
  jf_nezumi: "Training-source attribution applies; see the official VOICES.md.",
  jf_tebukuro: "Training-source attribution applies; see the official VOICES.md."
});

export const KOKORO_VOICES = Object.freeze(GROUPS.flatMap(([langCode, locale, accent, voices]) =>
  voices.map(id => Object.freeze({
    provider: "kokoro",
    id,
    name: id,
    gender: id[1] === "f" ? "female" : "male",
    language: locale.split("-")[0],
    locale,
    accent,
    langCode,
    modelLicense: KOKORO_MODEL.license,
    voiceRights: "not-separately-warranted",
    attribution: ATTRIBUTION[id] || ""
  }))
));

export function listKokoroVoices(search = "") {
  const query = search.trim().toLowerCase();
  if (!query) return [...KOKORO_VOICES];
  return KOKORO_VOICES.filter(voice =>
    [voice.id, voice.language, voice.locale, voice.accent, voice.gender]
      .some(value => value.toLowerCase().includes(query))
  );
}

export function kokoroProviderRoot() {
  return resolve(process.env.BASA_VIDEO_PROVIDER_HOME || join(homedir(), ".local", "share", "basa-video", "providers", "kokoro"));
}

export function kokoroPaths() {
  const root = kokoroProviderRoot();
  const venv = join(root, "venv");
  return {
    root,
    venv,
    python: process.platform === "win32" ? join(venv, "Scripts", "python.exe") : join(venv, "bin", "python"),
    modelDir: join(root, "model"),
    record: join(root, "provider.json"),
    modelRecord: join(root, "model-license.json"),
    requirements: join(root, "requirements.lock")
  };
}

export function resolveKokoroLanguage(language = "en", voice = KOKORO_MODEL.defaultVoice) {
  const selected = KOKORO_VOICES.find(item => item.id === voice);
  if (!selected) throw new Error(`Unknown Kokoro voice: ${voice}. Run "basa-video voices --provider kokoro".`);
  const normalized = String(language).toLowerCase();
  const aliases = {
    en: ["a", "b"], "en-us": ["a"], "en-gb": ["b"],
    es: ["e"], "fr": ["f"], "fr-fr": ["f"], hi: ["h"], it: ["i"],
    ja: ["j"], pt: ["p"], "pt-br": ["p"], zh: ["z"]
  };
  const allowed = aliases[normalized];
  if (!allowed) throw new Error(`Kokoro does not currently support language "${language}".`);
  if (!allowed.includes(selected.langCode)) {
    throw new Error(`Kokoro voice ${voice} is ${selected.locale}, not compatible with --language ${language}.`);
  }
  return selected.langCode;
}
