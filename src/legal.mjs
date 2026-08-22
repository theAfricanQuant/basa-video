import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const PROVIDER_NOTICES = Object.freeze({
  kokoro: {
    kind: "local",
    license: "Apache-2.0",
    source: "https://huggingface.co/hexgrad/Kokoro-82M",
    notice: "The setup command pins and hashes the reviewed model revision; voice personality rights are not separately warranted."
  },
  chatterbox: {
    kind: "local",
    license: "MIT",
    source: "https://github.com/resemble-ai/chatterbox",
    notice: "Preserve the PerTh watermark. Reference voices require documented rights."
  },
  qwen: {
    kind: "local",
    license: "Apache-2.0 (checkpoint-specific verification required)",
    source: "https://github.com/QwenLM/Qwen3-TTS",
    notice: "Verify the exact checkpoint model card and revision."
  },
  elevenlabs: {
    kind: "remote",
    license: "Service terms",
    source: "https://elevenlabs.io/terms-of-use-eu",
    notice: "Explicit opt-in only. Free-tier use is non-commercial and shared output requires attribution under current guidance."
  }
});

export function assertReferenceVoiceRights(options) {
  if (!options.reference_audio) return;
  if (!options.confirm_voice_rights) {
    throw new Error("--reference-audio requires --confirm-voice-rights. Confirm only if you are the speaker or have documented permission for the intended use.");
  }
  if (!options.voice_rights_record) {
    throw new Error("--reference-audio requires --voice-rights-record FILE containing the documented consent and permitted uses.");
  }
}

export async function loadVoiceRightsProvenance(options) {
  assertReferenceVoiceRights(options);
  if (!options.reference_audio) return null;

  let record;
  let recordBytes;
  let audioBytes;
  try {
    [recordBytes, audioBytes] = await Promise.all([
      readFile(options.voice_rights_record),
      readFile(options.reference_audio)
    ]);
    record = JSON.parse(recordBytes.toString("utf8"));
  } catch (error) {
    throw new Error(`Unable to validate voice-rights files: ${error.message}`);
  }

  const validBasis = ["self", "written-consent"].includes(record.authorizationBasis);
  if (!record.recordId || !validBasis || record.consentToSynthesis !== true || !record.permittedUse || typeof record.commercialUse !== "boolean") {
    throw new Error("Voice-rights record is incomplete. Validate it against schemas/voice-rights-record.schema.json.");
  }
  if (record.revoked === true) throw new Error("Voice-rights consent has been revoked.");
  if (record.expiresAt) {
    const expiry = Date.parse(record.expiresAt);
    if (!Number.isFinite(expiry)) throw new Error("Voice-rights consent expiry is invalid.");
    if (expiry <= Date.now()) throw new Error("Voice-rights consent has expired.");
  }

  const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
  return {
    recordId: record.recordId,
    authorizationBasis: record.authorizationBasis,
    permittedUse: record.permittedUse,
    commercialUse: record.commercialUse,
    expiresAt: record.expiresAt || null,
    recordSha256: sha256(recordBytes),
    referenceAudioSha256: sha256(audioBytes)
  };
}

export function assertProviderTerms(provider, options) {
  if (provider !== "elevenlabs") return;
  if (!["free", "paid", "enterprise"].includes(options.elevenlabs_plan)) {
    throw new Error("ElevenLabs requires --elevenlabs-plan free|paid|enterprise. Free-plan output is non-commercial and requires attribution when published.");
  }
  if (options.elevenlabs_plan === "free" && options.commercial) {
    throw new Error("ElevenLabs free-plan output cannot be rendered with --commercial.");
  }
}

export function buildProviderProvenance(provider, options = {}) {
  const notice = PROVIDER_NOTICES[provider] ?? {
    kind: "unreviewed",
    license: "UNREVIEWED",
    source: null,
    notice: "Provider licensing has not been reviewed."
  };
  return {
    syntheticNarration: true,
    provider,
    providerKind: notice.kind,
    providerLicense: notice.license,
    providerTerms: notice.source,
    providerNotice: notice.notice,
    providerPlan: provider === "elevenlabs" ? options.elevenlabs_plan : null,
    commercialUse: provider === "elevenlabs"
      ? (options.elevenlabs_plan === "free" ? "not-permitted" : "subject-to-provider-terms")
      : "subject-to-artifact-license-and-voice-rights",
    attributionRequired: provider === "elevenlabs" && options.elevenlabs_plan === "free",
    requiredAttribution: provider === "elevenlabs" && options.elevenlabs_plan === "free"
      ? "Credit ElevenLabs according to its current publishing guidance."
      : null,
    reviewedAt: "2026-08-22"
  };
}

export function formatProviderNotices() {
  return Object.entries(PROVIDER_NOTICES).map(([name, item]) =>
    [name, item.kind, item.license, item.notice, item.source].join("\t")
  ).join("\n");
}
