#!/usr/bin/env python3
"""Recopie scripts/inject.js dans Sources/SansScroll/Inject.swift.
À relancer après chaque modification de inject.js :  python3 scripts/embed.py
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
js = (root / "scripts" / "inject.js").read_text(encoding="utf-8")
assert '"""#' not in js, "inject.js ne doit pas contenir la séquence \"\"\"#"

swift = (
    "// Fichier généré par scripts/embed.py à partir de scripts/inject.js — ne pas modifier à la main.\n\n"
    "enum Inject {\n"
    '    static let source = #"""\n'
    + js.rstrip("\n")
    + '\n"""#\n}\n'
)
(root / "Sources" / "SansScroll" / "Inject.swift").write_text(swift, encoding="utf-8")
print("Inject.swift mis à jour")
