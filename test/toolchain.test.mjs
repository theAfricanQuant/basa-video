import test from "node:test";
import assert from "node:assert/strict";
import { platformHints } from "../src/toolchain.mjs";

test("toolchain gives native remediation on every supported platform", () => {
  assert.match(platformHints("win32").ffmpeg, /winget/);
  assert.match(platformHints("darwin").ffmpeg, /brew install ffmpeg/);
  assert.match(platformHints("linux").ffmpeg, /system package manager/);
  assert.match(platformHints("win32").browser, /Google\.Chrome/);
  assert.match(platformHints("darwin").browser, /google-chrome/);
});
