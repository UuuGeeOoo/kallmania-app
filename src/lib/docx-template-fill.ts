// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE-PRESERVING DOCX FILL ENGINE
//
// Instead of rebuilding reports from scratch, this engine takes the ORIGINAL
// uploaded master template (e.g. "Daily Report Call Centre.docx"), works on a
// COPY of it and inserts the report data into the existing structure —
// preserving every design element: logos & branding, headers/footers, fonts,
// colours, shading, borders, column widths, margins, page layout, section
// headings, embedded fonts, numbering, styles and theme.
//
// How it works:
//   1. JSZip opens the master .docx (a zip of XML parts).
//   2. word/document.xml is parsed with @xmldom/xmldom.
//   3. Data is written into the EXISTING table cells / paragraphs. Runs and
//      paragraph properties are reused, so filled text inherits the template's
//      own formatting. Missing runs are created from the cell's paragraph-mark
//      properties (w:pPr/w:rPr) so empty cells also keep the template style.
//   4. Rows are CLONED from the template's own last data row when the data has
//      more entries than the template reserved space for — the clone carries
//      the template's borders, shading, fonts and column widths.
//   5. Everything else in the package is left byte-identical.
// ─────────────────────────────────────────────────────────────────────────────

import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// ── DOM helpers ──────────────────────────────────────────────────────────────

/* Minimal structural typings over @xmldom/xmldom — enough for the fills and
   free of DOM-lib conflicts. Every node is dynamic; we only walk/append. */
interface XmlNode {
  nodeType: number;
  nodeName: string;
  localName?: string | null;
  textContent: string;
  childNodes: { length: number; item(i: number): XmlNode | null; [index: number]: XmlNode };
  appendChild(child: XmlNode): XmlNode;
  removeChild(child: XmlNode): XmlNode;
  insertBefore(node: XmlNode, ref: XmlNode | null): XmlNode;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string;
  parentNode: XmlNode | null;
  nextSibling: XmlNode | null;
  ownerDocument: XmlDocument | null;
  [key: string]: unknown;
}

interface XmlDocument extends XmlNode {
  documentElement: XmlNode;
  createElementNS(ns: string, qname: string): XmlNode;
  createTextNode(text: string): XmlNode;
  importNode(node: XmlNode, deep: boolean): XmlNode;
}

type Node = XmlNode;
type Doc = XmlDocument;

export type { Node, Doc };

function tagOf(el: Node): string {
  if (el.localName) return el.localName;
  return String(el.nodeName || "").replace(/^.*:/, "");
}

function children(el: Node, tag: string): Node[] {
  const out: Node[] = [];
  const list = el.childNodes;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c.nodeType === 1 && tagOf(c) === tag) out.push(c);
  }
  return out;
}

/** All descendants with the given tag (namespace-aware). */
function descendants(el: Node, tag: string): Node[] {
  const out: Node[] = [];
  const walk = (n: Node) => {
    const list = n.childNodes;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.nodeType === 1) {
        if (tagOf(c) === tag) out.push(c);
        walk(c);
      }
    }
  };
  walk(el);
  return out;
}

function parseXml(xml: string): Doc {
  return new DOMParser().parseFromString(xml, "application/xml") as unknown as Doc;
}

function serializeXml(doc: Doc): string {
  let out = new XMLSerializer().serializeToString(doc as unknown as Parameters<InstanceType<typeof XMLSerializer>["serializeToString"]>[0]);
  // Restore the original standalone declaration if the serializer shortened it.
  if (!out.startsWith("<?xml")) out = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${out}`;
  return out;
}

// ── Text helpers ─────────────────────────────────────────────────────────────

/** Normalise a label for matching: lowercase, letters & digits only. */
export function norm(s: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function runText(r: Node): string {
  let out = "";
  for (const t of descendants(r, "t")) out += t.textContent;
  return out;
}

function paraText(p: Node): string {
  let out = "";
  // only direct runs of this paragraph (runs inside nested tables would belong elsewhere)
  const list = p.childNodes;
  for (let i = 0; i < list.length; i++) {
    const child = list[i];
    if (!child || child.nodeType !== 1) continue;
    const tag = tagOf(child);
    if (tag === "r") out += runText(child);
    else if (tag === "hyperlink" || tag === "smartTag" || tag === "sdt") out += runText(child);
  }
  return out;
}

/** Full visible text of a table cell (all of its paragraphs). */
export function cellText(tc: Node): string {
  const parts: string[] = [];
  for (const p of children(tc, "p")) {
    const t = paraText(p);
    if (t.trim()) parts.push(t.trim());
  }
  // include text sitting directly in nested tables' cells (rare in these masters)
  for (const nested of children(tc, "tbl")) {
    for (const tr of children(nested, "tr")) {
      for (const ntc of children(tr, "tc")) parts.push(cellText(ntc));
    }
  }
  return parts.join(" ");
}

// ── Cell writing (formatting-preserving) ─────────────────────────────────────

/** Find (or create) the w:t of a run. */
function runTextEl(doc: Doc, r: Node): Node {
  for (const t of children(r, "t")) return t;
  const t = doc.createElementNS(W_NS, "w:t");
  t.setAttribute("xml:space", "preserve");
  r.appendChild(t);
  return t;
}

/** Build a run that copies the formatting of a reference run (or paragraph mark). */
function makeRunLike(doc: Doc, refRPr: Node | null, text: string): Node {
  const r = doc.createElementNS(W_NS, "w:r");
  if (refRPr) r.appendChild(doc.importNode(refRPr, true) as unknown as Node);
  const t = doc.createElementNS(W_NS, "w:t");
  t.setAttribute("xml:space", "preserve");
  t.appendChild(doc.createTextNode(text));
  r.appendChild(t);
  return r;
}

/**
 * Replace the text of one paragraph while keeping its run/paragraph formatting.
 * The paragraph's first run is reused (its rPr stays); other runs are dropped.
 * `lines` beyond the first become clones of the first paragraph.
 */
function setParagraphLines(doc: Doc, p: Node, lines: string[]): void {
  const runs = children(p, "r");
  const firstLine = lines[0] ?? "";
  if (runs.length > 0) {
    const keep = runs[0];
    // drop every run after the first, plus hyperlink/sdt wrappers' content stays untouched
    for (let i = 1; i < runs.length; i++) p.removeChild(runs[i]);
    const t = runTextEl(doc, keep);
    while (t.childNodes.length > 0) t.removeChild(t.childNodes[0]);
    t.appendChild(doc.createTextNode(firstLine));
  } else {
    // empty paragraph — derive run properties from the paragraph mark (pPr/rPr)
    const pPr = children(p, "pPr")[0];
    const rPr = pPr ? children(pPr, "rPr")[0] : null;
    p.appendChild(makeRunLike(doc, rPr, firstLine));
  }
  // additional lines → cloned paragraphs right after this one
  let anchor = p;
  for (let i = 1; i < lines.length; i++) {
    const clone = doc.importNode(p, true) as unknown as Node;
    // clear the clone's runs then write the line
    const cloneRuns = children(clone, "r");
    for (const r of cloneRuns) clone.removeChild(r);
    const pPr = children(clone, "pPr")[0];
    const rPr = pPr ? children(pPr, "rPr")[0] : null;
    clone.appendChild(makeRunLike(doc, rPr, lines[i]));
    anchor.parentNode?.insertBefore(clone, anchor.nextSibling);
    anchor = clone;
  }
}

/**
 * Remove all visible text from a table cell while keeping its design
 * (borders, shading, paragraph properties, run properties stay).
 */
export function clearCell(tc: Node): void {
  for (const p of children(tc, "p")) {
    for (const r of children(p, "r")) p.removeChild(r);
  }
}

/**
 * Write text into a table cell, preserving the cell's design.
 * Multi-line text: first line into the first paragraph, extra lines become
 * cloned paragraphs (so each keeps the template's spacing + fonts).
 * Empty string / null leaves the cell untouched (template convention).
 */
export function setCellText(doc: Doc, tc: Node, text: string | number | null | undefined): void {
  if (text === null || text === undefined) return;
  const raw = String(text);
  if (raw.trim() === "") return;
  const lines = raw.split(/\r?\n/).map((l) => l.trimEnd()).filter((l, i) => l.trim() !== "" || i === 0);
  const paras = children(tc, "p");
  if (paras.length === 0) return; // cannot write into a cell without paragraphs
  // write line 0 into the first paragraph; if the cell has more paragraphs
  // than lines and they contain text, clear their runs (they are being replaced)
  setParagraphLines(doc, paras[0], lines);
  if (lines.length === 1) {
    for (let i = 1; i < paras.length; i++) {
      for (const r of children(paras[i], "r")) paras[i].removeChild(r);
    }
  } else if (paras.length >= lines.length) {
    // extra template paragraphs keep their (empty) state
    for (let i = lines.length; i < paras.length; i++) {
      for (const r of children(paras[i], "r")) paras[i].removeChild(r);
    }
  }
}

// ── Table primitives ─────────────────────────────────────────────────────────

export type Table = Node;
export type Row = Node;
export type Cell = Node;

export function bodyTables(doc: Doc): Table[] {
  const body = descendants(doc, "body")[0];
  return body ? children(body, "tbl") : [];
}

export function rowsOf(tbl: Table): Row[] {
  return children(tbl, "tr");
}

export function cellsOf(tr: Row): Cell[] {
  return children(tr, "tc");
}

/** Deep-clone a row and insert it after `ref` (returns the clone). */
export function cloneRowAfter(doc: Doc, ref: Row): Row {
  const clone = doc.importNode(ref, true) as unknown as Node;
  ref.parentNode?.insertBefore(clone, ref.nextSibling);
  return clone;
}

/** Section-identification text: first row's joined cell text. */
export function tableTitle(tbl: Table): string {
  const rows = rowsOf(tbl);
  if (rows.length === 0) return "";
  return norm(cellText(cellsOf(rows[0])[0] || rows[0]));
}

/**
 * Fill "label | value [ | label | value ]" information rows.
 * `values` is keyed by normalised label. Only cells whose label matches are
 * written — everything else keeps the template text.
 */
export function fillLabeledPairs(doc: Doc, tbl: Table, values: Record<string, string | number | null>, skipRows = 0): void {
  for (const tr of rowsOf(tbl).slice(skipRows)) {
    const cells = cellsOf(tr);
    for (let c = 0; c + 1 < cells.length; c += 2) {
      const label = norm(cellText(cells[c]));
      if (label && label in values) setCellText(doc, cells[c + 1], values[label]);
    }
  }
}

/** Value formatting shared with the existing builders: 100% / 20mins / 42. */
export function fmtValue(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  if (unit === "percent") return `${v}%`;
  if (unit === "minutes") return `${v}mins`;
  return String(v);
}

export interface TemplateKpiRow {
  label?: string; // label as it appears in the TEMPLATE row (for appended rows)
  target?: string;
  actual?: string;
  variance?: string;
  notes?: string;
  extraColumns?: string[]; // values for any columns after Notes (supervisor layout)
}

/**
 * Fill a KPI-style table: header row(s) then data rows whose FIRST cell is the
 * metric label. `resolve(label)` returns the values for that row (or null to
 * leave the row untouched). Unknown metrics that should be appended are handed
 * to `append` — cloned from the last data row so the design carries over.
 */
export function fillKpiTable(
  doc: Doc,
  tbl: Table,
  resolve: (label: string) => TemplateKpiRow | null,
  opts: { headerRows?: number; append?: TemplateKpiRow[] } = {},
): void {
  const headerRows = opts.headerRows ?? 1;
  const rows = rowsOf(tbl);
  if (rows.length <= headerRows) return;
  const dataRows = rows.slice(headerRows);
  for (const tr of dataRows) {
    const cells = cellsOf(tr);
    if (cells.length < 2) continue;
    const label = norm(cellText(cells[0]));
    const row = resolve(label);
    if (!row) continue;
    setCellText(doc, cells[1], row.target);
    if (cells.length >= 3) setCellText(doc, cells[2], row.actual);
    if (cells.length >= 4) setCellText(doc, cells[3], row.variance);
    if (cells.length >= 5) setCellText(doc, cells[4], row.notes);
    if (cells.length >= 6 && row.extraColumns) {
      for (let i = 0; i < row.extraColumns.length && 5 + i < cells.length; i++) {
        setCellText(doc, cells[5 + i], row.extraColumns[i]);
      }
    }
  }
  // metrics with no template row → clone the last data row (design preserved).
  // The clone starts EMPTY so filled values from the source row never leak in.
  if (opts.append && opts.append.length > 0) {
    let anchor = dataRows[dataRows.length - 1];
    for (const row of opts.append) {
      const clone = cloneRowAfter(doc, anchor);
      anchor = clone;
      const cells = cellsOf(clone);
      for (const c of cells) clearCell(c);
      setCellText(doc, cells[0], row.label);
      setCellText(doc, cells[1], row.target);
      if (cells.length >= 3) setCellText(doc, cells[2], row.actual);
      if (cells.length >= 4) setCellText(doc, cells[3], row.variance);
      if (cells.length >= 5) setCellText(doc, cells[4], row.notes);
      if (cells.length >= 6 && row.extraColumns) {
        for (let i = 0; i < row.extraColumns.length && 5 + i < cells.length; i++) {
          setCellText(doc, cells[5 + i], row.extraColumns[i]);
        }
      }
    }
  }
}

export interface NumberedEntry { cells: (string | number | null)[] }

/**
 * Fill a numbered table ("# | col | col | …"). `startCol` is the first column
 * AFTER the row number. When there are more entries than template rows, the
 * last data row is cloned (inheriting borders/fonts/widths) and renumbered.
 */
export function fillNumberedTable(doc: Doc, tbl: Table, entries: NumberedEntry[], startCol = 1, headerRows = 1): void {
  const rows = rowsOf(tbl).slice(headerRows);
  if (rows.length === 0) return;
  let anchor: Row | null = null;
  for (let i = 0; i < entries.length; i++) {
    let tr: Row;
    if (i < rows.length) tr = rows[i];
    else {
      tr = cloneRowAfter(doc, anchor || rows[rows.length - 1]);
      for (const c of cellsOf(tr)) clearCell(c); // fresh clone — no inherited values
    }
    anchor = tr;
    const cells = cellsOf(tr);
    const entry = entries[i];
    // renumber the "#" column when cloned beyond the template rows
    if (i >= rows.length && cells.length > 0) setCellText(doc, cells[0], String(i + 1));
    for (let c = 0; c < entry.cells.length && startCol + c < cells.length; c++) {
      setCellText(doc, cells[startCol + c], entry.cells[c]);
    }
  }
}

/**
 * Fill a "section body" table (heading row + empty writing rows): the whole
 * text goes into the first empty data row, one paragraph per line, wrapping
 * naturally inside the cell. Remaining template rows stay as spare space.
 */
export function fillTextSection(tbl: Table, text: string | null | undefined, headerRows = 1): void {
  if (!text || !String(text).trim()) return;
  const rows = rowsOf(tbl).slice(headerRows);
  if (rows.length === 0) return;
  const cells = cellsOf(rows[0]);
  if (cells.length === 0) return;
  const tc = cells[0];
  const paras = children(tc, "p");
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== "");
  if (paras.length === 0) return;
  const doc = (tc as unknown as { ownerDocument: Doc }).ownerDocument;
  setParagraphLines(doc, paras[0], lines.length ? lines : [String(text)]);
  for (let i = 1; i < paras.length; i++) {
    for (const r of children(paras[i], "r")) paras[i].removeChild(r);
  }
}

// ── Package-level load/save ──────────────────────────────────────────────────

/**
 * Open a master DOCX, hand the parsed document + zip to `edit`, and return the
 * generated report as a Buffer. The master buffer itself is NEVER modified.
 */
export async function editDocxCopy(masterBuffer: Buffer, edit: (doc: Doc) => void): Promise<Buffer> {
  const zip = await JSZip.loadAsync(masterBuffer);
  const xml = await zip.file("word/document.xml")!.async("string");
  const doc = parseXml(xml);
  edit(doc);
  zip.file("word/document.xml", serializeXml(doc));
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return out as Buffer;
}

/** Cheap sanity check: is this buffer a DOCX with a document.xml part? */
export async function isDocxBuffer(buf: Buffer): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(buf);
    return !!zip.file("word/document.xml");
  } catch {
    return false;
  }
}
