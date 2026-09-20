#!/usr/bin/env python3
"""Writes a lossless WebP twin next to each landing-page image (hero.png -> hero.webp).

Lossless keeps the handout text pixel-identical to the PNG at about 40% of its size;
the page lists the WebP first and keeps the PNG as the fallback. Run after re-rendering
any of these images. Needs Pillow with WebP support (pip install pillow).
"""
import os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
IMAGES = ['hero.png', 'hero-ev303.png', 'hero-flot.png', 'compare.png', 'decision.png', 'route-kn522.png']

for name in IMAGES:
    src = os.path.join(ROOT, name)
    dst = src[:-4] + '.webp'
    Image.open(src).convert('RGB').save(dst, 'WEBP', lossless=True, quality=100, method=6)
    print(f"{name:18} {os.path.getsize(src) // 1024:4} KB -> {os.path.basename(dst):18} {os.path.getsize(dst) // 1024:4} KB")
