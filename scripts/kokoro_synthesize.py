#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
import sys
import warnings

MODEL_ID = "hexgrad/Kokoro-82M"


def download(model_dir: Path, revision: str) -> None:
    from huggingface_hub import snapshot_download

    snapshot_download(
        repo_id=MODEL_ID,
        revision=revision,
        local_dir=model_dir,
        allow_patterns=[
            "LICENSE",
            "README.md",
            "VOICES.md",
            "config.json",
            "kokoro-v1_0.pth",
            "voices/*.pt",
        ],
    )


def synthesize_batch(model_dir: Path, items: list[dict], device: str | None) -> None:
    import soundfile as sf
    import torch
    from kokoro import KModel, KPipeline

    warnings.filterwarnings("ignore", message="dropout option adds dropout")
    warnings.filterwarnings("ignore", message=".*weight_norm.*deprecated.*")

    config = model_dir / "config.json"
    weights = model_dir / "kokoro-v1_0.pth"
    for path in (config, weights):
        if not path.is_file():
            raise FileNotFoundError(f"Missing pinned Kokoro artifact: {path}")

    selected_device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    model = KModel(repo_id=MODEL_ID, config=str(config), model=str(weights)).to(selected_device).eval()
    pipelines: dict[str, KPipeline] = {}
    voices = {}

    for item in items:
        text = str(item["text"]).strip()
        if not text:
            raise ValueError("Narration text is empty")
        voice = item["voice"]
        lang_code = item["langCode"]
        output = Path(item["output"])
        speed = float(item.get("speed", 1))

        voice_path = model_dir / "voices" / f"{voice}.pt"
        if not voice_path.is_file():
            raise FileNotFoundError(f"Missing pinned Kokoro voice: {voice_path}")
        if voice not in voices:
            voices[voice] = torch.load(voice_path, weights_only=True)
        if lang_code not in pipelines:
            pipelines[lang_code] = KPipeline(lang_code=lang_code, repo_id=MODEL_ID, model=model)

        chunks = [
            result.audio
            for result in pipelines[lang_code](text, voice=voices[voice], speed=speed)
            if result.audio is not None
        ]
        if not chunks:
            raise RuntimeError(f"Kokoro produced no audio for {voice}")
        audio = torch.cat([chunk.flatten().cpu() for chunk in chunks]).numpy()
        output.parent.mkdir(parents=True, exist_ok=True)
        sf.write(output, audio, 24000)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--download-only", action="store_true")
    parser.add_argument("--batch-json", action="store_true")
    parser.add_argument("--model-dir", required=True, type=Path)
    parser.add_argument("--revision")
    parser.add_argument("--voice")
    parser.add_argument("--lang-code")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--device", choices=["cpu", "cuda", "mps"])
    args = parser.parse_args()

    if args.download_only:
        if not args.revision:
            parser.error("--revision is required with --download-only")
        download(args.model_dir, args.revision)
        return

    if args.batch_json:
        payload = json.load(sys.stdin)
        synthesize_batch(args.model_dir, payload["items"], args.device)
        return

    if not all((args.voice, args.lang_code, args.output)):
        parser.error("--voice, --lang-code and --output are required for synthesis")
    text = sys.stdin.read()
    synthesize_batch(args.model_dir, [{
        "text": text,
        "voice": args.voice,
        "langCode": args.lang_code,
        "output": str(args.output),
        "speed": args.speed,
    }], args.device)


if __name__ == "__main__":
    main()
