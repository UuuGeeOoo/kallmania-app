#!/usr/bin/env python3
"""Clasy rebrand: swap the violet/liquid-glass accent system for the warm orange one.
Runs over src/**/*.{ts,tsx} EXCLUDING src/app/globals.css (hand-written)."""
import pathlib, sys

ROOT = pathlib.Path("/home/z/my-project/src")
# ordered: longer/most-specific first
MAP = [
    ("rgba(108, 92, 231", "rgba(217, 138, 78"),
    ("rgba(108,92,231", "rgba(217,138,78"),
    ("rgba(139, 127, 245", "rgba(240, 180, 138"),
    ("rgba(139,127,245", "rgba(240,180,138"),
    ("rgba(124, 108, 242", "rgba(238, 170, 114"),
    ("rgba(124,108,242", "rgba(238,170,114"),
    ("rgba(232, 131, 58", "rgba(226, 145, 90"),
    ("rgba(232,131,58", "rgba(226,145,90"),
    ("rgba(220, 231, 117", "rgba(232, 162, 104"),
    ("rgba(220,231,117", "rgba(232,162,104"),
    ("#8b7ff5", "#f0b48a"),
    ("#b3a5ff", "#f0b48a"),
    ("#a99df8", "#e9a77b"),
    ("#c4bbff", "#f6c79b"),
    ("#7c6cf2", "#eeaa72"),
    ("#6c5ce7", "#d98a4e"),
    ("#5b4bd4", "#c97a3f"),
    ("#e8833a", "#e2915a"),
    ("#dce775", "#e8a268"),
    ("#31456b", "#3d2f22"),
    ("#22334e", "#2c2219"),
    ("#16233a", "#171310"),
    ("#15202e", "#171310"),
    ("#131f30", "#14100c"),
    ("#1b2a3b", "#171310"),
]

changed = {}
for p in sorted(ROOT.rglob("*")):
    if p.suffix not in {".ts", ".tsx"} or not p.is_file():
        continue
    if p == ROOT / "app" / "globals.css":
        continue
    text = p.read_text(encoding="utf-8")
    orig = text
    for old, new in MAP:
        text = text.replace(old, new)
    if text != orig:
        p.write_text(text, encoding="utf-8")
        changed[str(p.relative_to(ROOT.parent))] = sum(text.count(new) for old, new in MAP)

for f, n in sorted(changed.items()):
    print(f"{n:4d}  {f}")
print(f"\n{len(changed)} files updated")
