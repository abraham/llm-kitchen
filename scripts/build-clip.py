#!/usr/bin/env python3
"""Draw simple pictures and record CLIP's view of them for Ch 33 (tier T0).

Usage: scripts/.venv/bin/python scripts/build-clip.py

Writes:
  static/vision/<color>-<shape>.png  224x224 pictures of colored shapes, drawn here (no licensing
                                     questions), already the size CLIP reads, so its 7x7 grid of
                                     32-pixel patches lines up with the picture
  static/vision/clip.json            for each picture its patch vectors (first numbers only); and
                                     for each caption, how well it matches every picture
"""

from __future__ import annotations

import datetime
import json
import math
from pathlib import Path

import torch
from PIL import Image, ImageDraw
from transformers import CLIPModel, CLIPProcessor
from transformers.utils import cached_file

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static" / "vision"
MODEL = "openai/clip-vit-base-patch32"
SIZE = 224
PATCH_DIMS = 32
COLORS = {"red": "#d62828", "blue": "#1d4ed8", "green": "#15803d"}
SHAPES = ["circle", "square", "triangle", "star"]
EXTRA_CAPTIONS = ["a red shape", "something round", "a star", "a photo of a cat"]


def revision(model_id: str) -> str | None:
    path = Path(cached_file(model_id, "config.json"))
    return path.parent.name if path.parent.parent.name == "snapshots" else None


def draw(color: str, shape: str) -> Image.Image:
    scale = 4  # draw big, then shrink, for smooth edges
    s = SIZE * scale
    img = Image.new("RGB", (s, s), "#f7f4ee")
    d = ImageDraw.Draw(img)
    c, r = s / 2, s * 0.3
    if shape == "circle":
        d.ellipse([c - r, c - r, c + r, c + r], fill=color)
    elif shape == "square":
        d.rectangle([c - r, c - r, c + r, c + r], fill=color)
    elif shape == "triangle":
        d.polygon([(c, c - r * 1.1), (c + r * 1.1, c + r * 0.8), (c - r * 1.1, c + r * 0.8)], fill=color)
    elif shape == "star":
        points = [
            (
                c + (r * 1.15 if i % 2 == 0 else r * 0.48) * math.sin(i * math.pi / 5),
                c - (r * 1.15 if i % 2 == 0 else r * 0.48) * math.cos(i * math.pi / 5),
            )
            for i in range(10)
        ]
        d.polygon(points, fill=color)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def features(out) -> torch.Tensor:
    tensor = out if isinstance(out, torch.Tensor) else out.pooler_output
    return tensor / tensor.norm(dim=-1, keepdim=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    model = CLIPModel.from_pretrained(MODEL, dtype=torch.float32).eval()
    processor = CLIPProcessor.from_pretrained(MODEL)

    names, images = [], []
    for color, hex_color in COLORS.items():
        for shape in SHAPES:
            name = f"{color}-{shape}"
            img = draw(hex_color, shape)
            img.save(OUT / f"{name}.png", optimize=True)
            names.append(name)
            images.append(img)

    captions = [f"a {n.replace('-', ' ')}" for n in names] + EXTRA_CAPTIONS
    with torch.no_grad():
        pixels = processor(images=images, return_tensors="pt").pixel_values
        image_vecs = features(model.get_image_features(pixel_values=pixels))
        text = processor(text=captions, return_tensors="pt", padding=True)
        text_vecs = features(model.get_text_features(**text))
        patches = model.vision_model.embeddings.patch_embedding(pixels).flatten(2).transpose(1, 2)
        scale = model.logit_scale.exp()

    similarity = text_vecs @ image_vecs.T
    probs = (scale * similarity).softmax(-1)
    grid = SIZE // model.config.vision_config.patch_size
    data = {
        "version": 1,
        "model": {"id": MODEL, "displayName": "CLIP ViT-B/32", "revision": revision(MODEL)},
        "imageSize": SIZE,
        "patchSize": model.config.vision_config.patch_size,
        "grid": grid,
        "patchDimensions": patches.shape[-1],
        "embeddingDimensions": image_vecs.shape[-1],
        "images": [
            {
                "name": n,
                "file": f"vision/{n}.png",
                "patches": [[round(float(v), 3) for v in p[:PATCH_DIMS]] for p in patches[i]],
            }
            for i, n in enumerate(names)
        ],
        "captions": [
            {
                "text": t,
                "similarity": [round(float(v), 4) for v in similarity[j]],
                "probability": [round(float(v), 4) for v in probs[j]],
            }
            for j, t in enumerate(captions)
        ],
        "generatedAt": datetime.date.today().isoformat(),
        "source": {"torch": torch.__version__},
    }
    (OUT / "clip.json").write_text(json.dumps(data, ensure_ascii=False) + "\n")
    print((OUT / "clip.json").relative_to(ROOT))
    for j, t in enumerate(captions):
        best = probs[j].topk(3)
        print(f"{t!r:28}", [(names[int(i)], round(float(v), 3)) for v, i in zip(*best)])


if __name__ == "__main__":
    main()
