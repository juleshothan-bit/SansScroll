#!/usr/bin/env python3
"""Génère Resources/AppIcon.png (1024x1024) sans dépendance externe."""
import struct
import zlib
from pathlib import Path

S = 1024
# Dégradé façon Instagram : jaune → orange → rose → violet → bleu (bas-gauche → haut-droite)
STOPS = [(0.0, (254, 218, 117)), (0.25, (250, 126, 30)), (0.5, (214, 41, 118)),
         (0.75, (150, 47, 191)), (1.0, (79, 91, 213))]


def grad(t):
    for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            return bytes(int(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
    return bytes(STOPS[-1][1])


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
        t = min(1.0, max(0.0, (x + (S - y)) / (2 * S)))
        white = (
            (in_rrect(x, y, 292, 212, 732, 812, 90)
             and not in_rrect(x, y, 336, 256, 688, 768, 46))
            or in_rrect(x, y, 382, 478, 642, 546, 34)
        )
        if white:
            rows += b"\xff\xff\xff"
        else:
            rows += grad(t)


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
