#!/usr/bin/env python3
"""Generate the BeforeYouPaste extension icons.

Draws a navy shield with a gold checkmark at 128px and downscales it to the
sizes Chrome needs. Requires Pillow: pip install Pillow

Usage: python scripts/generate-icons.py
Output: icons/icon16.png, icon32.png, icon48.png, icon128.png
"""
import os

from PIL import Image, ImageDraw

NAVY = (11, 31, 58, 255)
GOLD = (212, 175, 55, 255)
SIZES = (128, 48, 32, 16)
BASE = 512


def draw_shield(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / BASE
    shield = [
        (256 * s, 30 * s),
        (440 * s, 90 * s),
        (440 * s, 250 * s),
        (256 * s, 482 * s),
        (72 * s, 250 * s),
        (72 * s, 90 * s),
    ]
    d.polygon(shield, fill=NAVY)
    check = [(150 * s, 260 * s), (228 * s, 338 * s), (368 * s, 168 * s)]
    d.line(check, fill=GOLD, width=int(44 * s), joint="curve")
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    master = draw_shield(BASE)
    for size in SIZES:
        icon = master.resize((size, size), Image.LANCZOS)
        path = os.path.join(out_dir, "icon%d.png" % size)
        icon.save(path)
        print("wrote", path)


if __name__ == "__main__":
    main()
