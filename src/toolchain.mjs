import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

export const QUARTO_VERSION = "1.10.18";

async function fileExists(path) {
  try { await access(path, constants.X_OK); return true; } catch { return false; }
}

async function capture(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => code === 0
      ? resolve(stdout.trim() || stderr.trim())
      : reject(new Error(`${command} exited with ${code}: ${stderr.slice(-500)}`)));
  });
}

async function run(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function commandVersion(command, args = ["--version"]) {
  try { return { executable: command, version: await capture(command, args) }; }
  catch { return null; }
}

export async function resolveQuartoExecutable({ required = true } = {}) {
  const configured = process.env.BASA_VIDEO_QUARTO || process.env.QUARTO_PATH;
  if (configured && await fileExists(configured)) return configured;
  if (await commandVersion("quarto")) return "quarto";
  try {
    const bin = await capture("uv", ["tool", "dir", "--bin"]);
    const candidate = join(bin, process.platform === "win32" ? "quarto.exe" : "quarto");
    if (await fileExists(candidate)) return candidate;
  } catch {}
  if (!required) return null;
  throw new Error("Quarto is unavailable. Run: basa-video setup --accept-model-license");
}

export async function ensureQuarto({ pythonVersion = "3.12" } = {}) {
  const existing = await resolveQuartoExecutable({ required: false });
  if (existing) return existing;
  await run("uv", ["tool", "install", "--managed-python", "--python", pythonVersion, `quarto-cli==${QUARTO_VERSION}`]);
  return resolveQuartoExecutable();
}

export async function resolveFfmpegExecutable({ probe = false, required = true } = {}) {
  const configured = probe ? process.env.BASA_VIDEO_FFPROBE : process.env.BASA_VIDEO_FFMPEG;
  const command = probe ? "ffprobe" : "ffmpeg";
  if (configured && await fileExists(configured)) return configured;
  if (await commandVersion(command, ["-version"])) return command;
  if (!required) return null;
  throw new Error(`${command} is unavailable. ${platformHints().ffmpeg}`);
}

function browserCandidates() {
  const candidates = [];
  const configured = process.env.BASA_VIDEO_BROWSER || process.env.CHROME_PATH;
  if (configured) candidates.push(configured);
  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else if (process.platform === "win32") {
    for (const root of [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean)) {
      candidates.push(
        join(root, "Google", "Chrome", "Application", "chrome.exe"),
        join(root, "Chromium", "Application", "chrome.exe")
      );
    }
  } else {
    candidates.push("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser");
  }
  return candidates;
}

export async function resolveBrowserExecutable({ required = true } = {}) {
  for (const candidate of browserCandidates()) if (await fileExists(candidate)) return candidate;
  for (const command of ["google-chrome", "chromium", "chromium-browser"]) {
    if (await commandVersion(command)) return command;
  }
  if (!required) return null;
  throw new Error(`Chrome or Chromium is unavailable. ${platformHints().browser}`);
}

export function platformHints(platform = process.platform) {
  if (platform === "win32") return {
    ffmpeg: "Install FFmpeg with: winget install Gyan.FFmpeg",
    browser: "Install Chrome with: winget install Google.Chrome"
  };
  if (platform === "darwin") return {
    ffmpeg: "Install FFmpeg with: brew install ffmpeg",
    browser: "Install Chrome with: brew install --cask google-chrome"
  };
  return {
    ffmpeg: "Install FFmpeg with your system package manager (for Ubuntu/Debian: sudo apt install ffmpeg).",
    browser: "Install Google Chrome or Chromium with your system package manager."
  };
}

export async function inspectToolchain() {
  const [uv, quarto, ffmpeg, ffprobe, browser] = await Promise.all([
    commandVersion("uv"),
    resolveQuartoExecutable({ required: false }),
    resolveFfmpegExecutable({ required: false }),
    resolveFfmpegExecutable({ probe: true, required: false }),
    resolveBrowserExecutable({ required: false })
  ]);
  const versionOf = async (executable, args = ["--version"]) =>
    executable ? (await commandVersion(executable, args))?.version || "available" : null;
  const hints = platformHints();
  return [
    { tool: "uv", required: true, available: Boolean(uv), version: uv?.version || "", hint: "Install from https://docs.astral.sh/uv/" },
    { tool: "Quarto", required: false, available: Boolean(quarto), version: await versionOf(quarto), hint: "Basa setup installs the official pinned quarto-cli with uv when needed." },
    { tool: "FFmpeg", required: true, available: Boolean(ffmpeg), version: await versionOf(ffmpeg, ["-version"]), hint: hints.ffmpeg },
    { tool: "FFprobe", required: true, available: Boolean(ffprobe), version: await versionOf(ffprobe, ["-version"]), hint: hints.ffmpeg },
    { tool: "Chrome/Chromium", required: true, available: Boolean(browser), version: await versionOf(browser), hint: hints.browser }
  ];
}

export async function assertRenderToolchain({ requiresQuarto = true } = {}) {
  const [quarto, ffmpeg, ffprobe, browser] = await Promise.all([
    requiresQuarto ? resolveQuartoExecutable() : null,
    resolveFfmpegExecutable(),
    resolveFfmpegExecutable({ probe: true }),
    resolveBrowserExecutable()
  ]);
  return { quarto, ffmpeg, ffprobe, browser };
}

export async function printDoctor() {
  const rows = await inspectToolchain();
  console.table(rows.map(row => ({
    tool: row.tool,
    required: row.required ? "yes" : "for QMD",
    status: row.available ? "ready" : "missing",
    version: String(row.version || "").split("\n")[0],
    action: row.available ? "" : row.hint
  })));
  return rows.every(row => !row.required || row.available);
}
