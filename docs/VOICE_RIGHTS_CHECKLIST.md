# Voice rights checklist

This is an operational checklist, not a substitute for advice from qualified
counsel in the relevant jurisdiction. Do not commit signed permissions or
reference recordings to the source repository.

Before using reference audio, record privately:

- identity and contact information of the speaker/rightsholder;
- how identity and authority were verified;
- the exact recordings covered;
- permission to use the recording for synthetic voice generation;
- permitted purposes, audiences, territories and commercial status;
- whether generated output may be edited, redistributed or sublicensed;
- duration, revocation and deletion terms;
- attribution and AI-disclosure requirements;
- date, signatures and the governing jurisdiction.

At generation time, Basa Video requires both `--confirm-voice-rights` and a
private `--voice-rights-record FILE` matching
`schemas/voice-rights-record.schema.json`. The manifest stores only the
internal record ID, authorization scope, and SHA-256 hashes of the record and
reference audio—not personal details or file paths. Keep the source
authorization in an access-controlled records system.

Do not proceed when authority is ambiguous, when the recording contains
multiple speakers without separate permission, or when the intended use falls
outside the documented permission.
