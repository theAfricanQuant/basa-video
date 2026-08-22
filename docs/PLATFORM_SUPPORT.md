# Platform support

Basa Video supports Windows, macOS, and Linux through one CLI. The portable
contract is deliberately simple:

- Node.js runs Basa.
- uv owns Basa's Python 3.12 and local TTS environment. Basa does not use or
  modify the system Python.
- `basa-video setup` uses an existing Quarto installation or installs the
  pinned official `quarto-cli` as a uv tool.
- FFmpeg/FFprobe and Chrome/Chromium are native platform applications. Basa
  discovers them without bundling or relicensing them.

## Common workflow

```bash
npm install
npm link
basa-video setup --accept-model-license
basa-video doctor
basa-video render deck.qmd --output deck.mp4
```

`doctor` reports every executable Basa resolved and gives an operating-system
specific installation command for anything missing. `BASA_VIDEO_QUARTO`,
`BASA_VIDEO_FFMPEG`, `BASA_VIDEO_FFPROBE`, and `BASA_VIDEO_BROWSER` can point to
non-standard executable locations.

## Windows

Install Node.js and uv, then install the native media tools when `doctor` asks:

```powershell
winget install Gyan.FFmpeg
winget install Google.Chrome
```

Run the common workflow in PowerShell or Windows Terminal. Paths containing
spaces are supported because Basa launches processes without a shell.

## macOS

Install Node.js and uv. Homebrew commands for native media tools are:

```bash
brew install ffmpeg
brew install --cask google-chrome
```

Apple Silicon and Intel machines use the same Basa commands. Kokoro defaults
to CPU for predictable installation; `--accelerator auto` opts into uv's
hardware-aware PyTorch selection.

## Linux

Install Node.js and uv. Use the distribution package manager for FFmpeg and
Chrome or Chromium. On Ubuntu or Debian, for example:

```bash
sudo apt install ffmpeg chromium
```

Package names vary by distribution, so `doctor` verifies the executable rather
than assuming a particular package manager.

## Packaging boundary

The npm package contains Basa's JavaScript, helper script, documentation, and
schemas. It does not redistribute Python, model weights, FFmpeg, Chrome, or
Quarto. This keeps installation reproducible while preserving the distinct
license and update boundaries of those tools.
