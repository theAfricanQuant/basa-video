import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import YAML from "yaml";
import { resolveFfmpegExecutable, resolveQuartoExecutable } from "./toolchain.mjs";

export function parseFrontMatter(source) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  return match ? YAML.parse(match[1]) ?? {} : {};
}

export function parseArgs(argv) {
  const [command, ...tokens] = argv;
  const input = tokens[0] && !tokens[0].startsWith("--") ? tokens.shift() : undefined;
  const rest = tokens;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) options[key] = true;
    else { options[key] = next; i += 1; }
  }
  return { command, input, options };
}

export function splitVoice(value, fallbackProvider = "kokoro") {
  if (!value) return { provider: fallbackProvider, voice: undefined };
  const index = value.indexOf(":");
  if (index < 0) return { provider: fallbackProvider, voice: value };
  return { provider: value.slice(0, index), voice: value.slice(index + 1) };
}

export function hashNarration({ provider, voice, model, language, text, speed = 1 }) {
  return createHash("sha256")
    .update(JSON.stringify({ provider, voice, model, language, text, speed }))
    .digest("hex").slice(0, 20);
}

export function secondsToSrt(value) {
  const ms = Math.max(0, Math.round(value * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

export async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

export async function run(command, args, { cwd, quiet = false, input, env } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, env: env ? { ...process.env, ...env } : process.env, stdio: [input ? "pipe" : "ignore", quiet ? "pipe" : "inherit", quiet ? "pipe" : "inherit"] });
    let stderr = "";
    if (quiet) child.stderr.on("data", chunk => { stderr += chunk; });
    if (input) { child.stdin.write(input); child.stdin.end(); }
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with ${code}${stderr ? `: ${stderr.slice(-1000)}` : ""}`)));
  });
}

export async function capture(command, args, { cwd } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolvePromise(stdout) : reject(new Error(`${command} exited with ${code}: ${stderr.slice(-1000)}`)));
  });
}

export async function probeDuration(path) {
  const ffprobe = await resolveFfmpegExecutable({ probe: true });
  const output = await capture(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path]);
  const duration = Number(output.trim());
  if (!Number.isFinite(duration)) throw new Error(`Could not determine duration of ${path}`);
  return duration;
}

export async function renderInput(inputPath, workDir) {
  const input = resolve(inputPath);
  const extension = extname(input).toLowerCase();
  if (extension === ".html" || extension === ".htm") return { htmlPath: input, config: {} };
  if (extension !== ".qmd") throw new Error("Input must be a .qmd or Reveal.js .html file");
  const source = await readFile(input, "utf8");
  const config = parseFrontMatter(source);
  const renderDir = join(workDir, "rendered");
  await mkdir(renderDir, { recursive: true });
  const quartoExecutable = await resolveQuartoExecutable();
  const quartoVersion = (await capture(quartoExecutable, ["--version"])).trim();
  await run(quartoExecutable, ["render", input, "--to", "revealjs", "--output-dir", renderDir]);
  return { htmlPath: join(renderDir, `${basename(input, extension)}.html`), config, quartoExecutable, quartoVersion };
}

export async function saveJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2));
}
