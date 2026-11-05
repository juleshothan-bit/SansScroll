#!/usr/bin/env python3
"""Génère Resources/AppIcon.png (1024x1024) sans dépendance externe."""
import struct
import zlib
from pathlib import Path

S = 1024
TOP, BOT = (255, 122, 89), (124, 58, 237)


def in_rrect(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


rows = bytearray()
for y in range(S):
    rows.append(0)
    for x in range(S):
        t = (x * 0.35 + y * 0.65) / S
        white = (
            (in_rrect(x, y, 292, 212, 732, 812, 90)
             and not in_rrect(x, y, 336, 256, 688, 768, 46))
            or in_rrect(x, y, 382, 478, 642, 546, 34)
        )
        if white:
            rows += b"\xff\xff\xff"
        else:
            rows += bytes(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))


def chunk(kind, data):
    c = kind + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)


png = (
    b"\x89PNG\r\n\x1a\n"
    + chunk(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 2, 0, 0, 0))
    + chunk(b"IDAT", zlib.compress(bytes(rows), 9))
    + chunk(b"IEND", b"")
)
out = Path(__file__).resolve().parent.parent / "Resources" / "AppIcon.png"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(png)
print("Icône écrite :", out)
