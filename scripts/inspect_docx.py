#!/usr/bin/env python3
"""Inspect a DOCX template: dump paragraph texts and table structures."""
import sys, re
from xml.dom import minidom

path = sys.argv[1]
doc = minidom.parse(path)

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

def cell_text(tc):
    parts = []
    for p in tc.getElementsByTagNameNS(W, "p"):
        runs = []
        for r in p.getElementsByTagNameNS(W, "r"):
            for t in r.getElementsByTagNameNS(W, "t"):
                for c in t.childNodes:
                    if c.nodeType == c.TEXT_NODE:
                        runs.append(c.data)
        parts.append("".join(runs))
    return " | ".join(x for x in parts if x.strip()) or "·"

def para_text(p):
    runs = []
    for r in p.getElementsByTagNameNS(W, "r"):
        for t in r.getElementsByTagNameNS(W, "t"):
            for c in t.childNodes:
                if c.nodeType == c.TEXT_NODE:
                    runs.append(c.data)
    return "".join(runs)

body = doc.getElementsByTagNameNS(W, "body")[0]
idx = 0
for child in body.childNodes:
    if child.nodeType != child.ELEMENT_NODE:
        continue
    tag = child.localName
    if tag == "p":
        txt = para_text(child)
        if txt.strip():
            print(f"[{idx}] P: {txt.strip()[:110]}")
    elif tag == "tbl":
        rows = child.getElementsByTagNameNS(W, "tr")  # includes nested
        print(f"[{idx}] TABLE ({len(rows)} rows):")
        for ri, tr in enumerate(rows):
            cells = tr.getElementsByTagNameNS(W, "tc")  # includes nested
            texts = [cell_text(tc) for tc in cells]
            print(f"    r{ri}: {texts}")
    else:
        print(f"[{idx}] <{tag}>")
    idx += 1
