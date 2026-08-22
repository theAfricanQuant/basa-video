# Model and voice policy

## Install records

Every downloaded model or voice must have a machine-readable record containing:

- provider, artifact name and immutable revision;
- canonical source URL and download timestamp;
- SHA-256 checksum;
- declared SPDX license and a local copy/link to the license text;
- whether commercial use, redistribution, attribution or notice is restricted;
- whether the voice is built-in, designed, cloned or supplied by the user.

Setup fails closed when the artifact license is missing, unknown, conflicts
with distribution, or differs from the reviewed allowlist. A model license
does not automatically cover third-party voice files.

## Reference audio and cloning

Basa Video must not clone or condition on a real person's voice unless the user
explicitly confirms that they are the speaker or have documented permission
covering the intended use. Reference audio must not be packaged, uploaded,
shared or retained beyond the configured cache policy. Generated manifests
record the consent acknowledgement, provider and artifact hash, but should not
publish the private source path.

Do not clone public figures, deceive listeners, remove provenance signals or
use synthetic voices where disclosure is legally required. Users remain
responsible for local publicity, privacy, biometric-data and impersonation law.

## Provider rules

### Kokoro

Kokoro is the default local provider. Pin Apache-2.0 model revisions and use
only built-in or separately verified voices. Community voices require their
own license records.

### Chatterbox

Use the MIT-licensed upstream release. Preserve the PerTh watermark and its
detection compatibility. Reference-audio generation requires explicit rights
confirmation.

### Qwen3-TTS

Install only an exact checkpoint whose model card declares Apache-2.0. Do not
infer a checkpoint license from the broader Qwen brand or another repository.

### ElevenLabs

Use only when explicitly selected. Never activate paid generation merely
because a key exists. Keep keys server-side/in the environment and recommend
scoped keys and quotas. Current ElevenLabs terms limit free users to non-commercial use; shared free-plan
output also requires attribution under current guidance. Commercial output requires
an eligible paid plan. EEA/UK users must follow the regional terms at
https://elevenlabs.io/terms-of-use-eu.
Users must have necessary input/voice rights and comply with the current
service and prohibited-use terms.

## Release gate

Before publishing:

1. Run tests, dependency audit and `npm run check:licenses`.
2. Generate an SBOM and full third-party notices from the lockfile.
3. Verify every default downloadable artifact again at its pinned source.
4. Confirm no external binary, model weight, voice or reference recording has
   been accidentally included.
5. Re-review cloud-provider terms because they may change independently.
