import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertProviderTerms, assertReferenceVoiceRights, buildProviderProvenance, loadVoiceRightsProvenance, PROVIDER_NOTICES } from "../src/legal.mjs";

test("reviewed providers carry licensing notices", () => {
  for (const provider of ["kokoro", "chatterbox", "qwen", "elevenlabs"]) {
    assert.ok(PROVIDER_NOTICES[provider]?.license);
    assert.ok(PROVIDER_NOTICES[provider]?.source);
  }
});

test("reference audio fails closed without rights confirmation and a consent record", () => {
  assert.throws(() => assertReferenceVoiceRights({ reference_audio: "voice.wav" }), /--confirm-voice-rights/);
  assert.throws(() => assertReferenceVoiceRights({ reference_audio: "voice.wav", confirm_voice_rights: true }), /--voice-rights-record/);
  assert.doesNotThrow(() => assertReferenceVoiceRights({ reference_audio: "voice.wav", confirm_voice_rights: true, voice_rights_record: "consent.json" }));
});

test("ElevenLabs requires an explicit plan declaration", () => {
  assert.throws(() => assertProviderTerms("elevenlabs", {}), /--elevenlabs-plan/);
  assert.throws(() => assertProviderTerms("elevenlabs", { elevenlabs_plan: "free", commercial: true }), /cannot be rendered/);
  assert.doesNotThrow(() => assertProviderTerms("elevenlabs", { elevenlabs_plan: "paid", commercial: true }));
  assert.doesNotThrow(() => assertProviderTerms("kokoro", {}));
});

test("provenance marks ElevenLabs free output non-commercial", () => {
  const provenance = buildProviderProvenance("elevenlabs", { elevenlabs_plan: "free" });
  assert.equal(provenance.syntheticNarration, true);
  assert.equal(provenance.commercialUse, "not-permitted");
  assert.equal(provenance.attributionRequired, true);
});

test("consent provenance validates files without exposing their paths", async () => {
  const directory = await mkdtemp(join(tmpdir(), "basa-video-consent-"));
  const audio = join(directory, "reference.wav");
  const record = join(directory, "rights.json");
  await writeFile(audio, "test audio bytes");
  await writeFile(record, JSON.stringify({
    recordId: "rights-001",
    authorizationBasis: "self",
    consentToSynthesis: true,
    permittedUse: "private presentation",
    commercialUse: false,
    revoked: false
  }));
  const provenance = await loadVoiceRightsProvenance({
    reference_audio: audio,
    voice_rights_record: record,
    confirm_voice_rights: true
  });
  assert.equal(provenance.recordId, "rights-001");
  assert.match(provenance.referenceAudioSha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(provenance).includes(directory), false);
});
