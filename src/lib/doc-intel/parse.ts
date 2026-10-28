// ─────────────────────────────────────────────────────────────────────────────
// STAGE A — STRUCTURE-PRESERVING DOCUMENT PARSERS
//
// Pattern adapted from the genai_agents "Document Intake Agent": route the
// format deterministically, then CONVERT rather than scrape. Naive text
// extraction strips table structure, so a KPI table becomes word soup where
// "value belongs to label" depends on the model counting tokens. Here every
// parser emits a DocumentIR whose tables are real row/column structures and
// whose markdown rendering keeps that structure intact for the LLM stages.
// ─────────────────────────────────────────────────────────────────────────────
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import type { DocBlock, DocumentIR } from "./types";

const ref = (prefix: string, n: number) => `${prefix} ${n}`;

// ── DOCX: mammoth → clean HTML → blocks (tables preserved as matrices) ──

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/** Split mammoth's flat HTML into top-level block segments. */
function splitTopLevel(html: string): string[] {
  const blocks: string[] = [];
  const re = /<(table|p|h1|h2|h3|h4|h5|h6|ul|ol)[\s>]/gi;
  type Open = { tag: string; start: number; depth: number };
  const stack: Open[] = [];
  let last = 0;
  const tagRe = /<(\/?)(table|p|h1|h2|h3|h4|h5|h6|ul|ol|tr|li|td|th)[\s>]/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const container = ["table", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol"].includes(tag);
    if (!closing && container) {
      if (stack.length === 0) {
        // flush whatever trivial content precedes this block
        const between = html.slice(last, m.index);
        if (between.trim()) blocks.push(between.trim());
      }
      stack.push({ tag, start: m.index, depth: stack.length });
    } else if (closing && container) {
      // pop until matching tag (tables can nest in theory — mammoth rarely nests)
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          const open = stack[i];
          if (i === 0) {
            const end = html.indexOf("</" + tag + ">", m.index);
            const stop = end >= 0 ? end + tag.length + 3 : m.index + m[0].length;
            blocks.push(html.slice(open.start, stop));
            last = stop;
          }
          stack.length = i;
          break;
        }
      }
    }
  }
  if (stack.length === 0) {
    const rest = html.slice(last);
    if (rest.trim()) blocks.push(rest.trim());
  }
  return blocks.filter(Boolean);
}

function parseHtmlTable(tblHtml: string, index: number): DocBlock | null {
  const rows: string[][] = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tblHtml))) {
    const rowHtml = tr[0];
    const cells: string[] = [];
    const cellRe = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
    let cm: RegExpExecArray | null;
    let spans = 0;
    while ((cm = cellRe.exec(rowHtml))) {
      const colspan = /colspan\s*=\s*["']?(\d+)/i.exec(cm[0]);
      const text = stripTags(cm[2]);
      cells.push(text);
      const n = colspan ? Math.max(1, Math.min(12, parseInt(colspan[1], 10))) : 1;
      for (let i = 1; i < n; i++) cells.push("");
      spans += n;
    }
    if (cells.length) {
      rows.push(cells);
      if (spans === 0) rows[rows.length - 1] = cells;
    }
  }
  if (!rows.length) return null;
  const width = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => { const c = r.slice(); while (c.length < width) c.push(""); return c; });
  // Heuristic: first row is the header when it differs from the rest and has no numbers-only cells
  const first = norm[0];
  const looksHeader = norm.length > 1 && first.some((c) => c.length > 0) &&
    !first.every((c) => /^[\d.,%\s-]*$/.test(c));
  const header = looksHeader ? first : [];
  const body = looksHeader ? norm.slice(1) : norm;
  return {
    kind: "table",
    header,
    rows: body,
    rowCount: body.length,
    ref: ref("Table", index),
  };
}

function parseHtmlBlock(block: string, counters: { h: number; t: number; p: number; l: number }): DocBlock | null {
  const headingM = /^<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i.exec(block);
  if (headingM) {
    const text = stripTags(headingM[2]);
    if (!text) return null;
    counters.h++;
    return { kind: "heading", level: parseInt(headingM[1], 10), text, ref: ref("Heading", counters.h) };
  }
  if (/^<table[\s>]/i.test(block)) {
    counters.t++;
    const parsed = parseHtmlTable(block, counters.t);
    return parsed;
  }
  if (/^<(ul|ol)[\s>]/i.test(block)) {
    const items: string[] = [];
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let li: RegExpExecArray | null;
    while ((li = liRe.exec(block))) {
      const t = stripTags(li[1]);
      if (t) items.push(t);
    }
    if (!items.length) return null;
    counters.l++;
    return { kind: "list", items, ref: ref("List", counters.l) };
  }
  const text = stripTags(block);
  if (!text) return null;
  counters.p++;
  return { kind: "paragraph", text, ref: ref("Paragraph", counters.p) };
}

export function blocksToMarkdown(blocks: DocBlock[]): string {
  const out: string[] = [];
  let lastHeading = "";
  for (const b of blocks) {
    if (b.kind === "heading") {
      lastHeading = b.text;
      out.push(`\n${"#".repeat(Math.min(6, Math.max(2, b.level + 1)))} ${b.text}\n`);
    } else if (b.kind === "paragraph") {
      out.push(b.text + "\n");
    } else if (b.kind === "list") {
      for (const item of b.items) out.push(`- ${item}`);
      out.push("");
    } else if (b.kind === "table") {
      const header = b.header.length ? b.header : b.rows[0]?.map((_, i) => `Column ${i + 1}`) ?? [];
      const body = b.header.length ? b.rows : b.rows.slice(1);
      const width = header.length;
      const mdRow = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => (cells[i] ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim()).join(" | ")} |`;
      out.push(`[Table — ${b.ref}${lastHeading ? ` (under "${lastHeading}")` : ""}]`);
      out.push(mdRow(header));
      out.push(`|${Array.from({ length: width }, () => " --- ").join("|")}|`);
      for (const r of body) out.push(mdRow(r));
      out.push("");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function parseDocx(buffer: Buffer): Promise<DocumentIR> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const segments = splitTopLevel(html);
  const counters = { h: 0, t: 0, p: 0, l: 0 };
  const blocks: DocBlock[] = [];
  for (const seg of segments) {
    const b = parseHtmlBlock(seg, counters);
    if (b) blocks.push(b);
  }
  const markdown = blocksToMarkdown(blocks);
  return {
    format: "docx",
    routeNote: "DOCX converted via HTML structure — tables/headings/reading order preserved",
    blocks,
    markdown,
    stats: {
      headings: counters.h,
      tables: counters.t,
      paragraphs: blocks.filter((b) => b.kind === "paragraph").length,
      chars: markdown.length,
    },
  };
}

// ── XLSX / CSV: every sheet becomes a markdown table with sheet context ──

export async function parseSheet(buffer: Buffer, format: "xlsx" | "csv"): Promise<DocumentIR> {
  const wb = XLSX.read(buffer, { type: "buffer", raw: false });
  const blocks: DocBlock[] = [];
  const sheetNames: string[] = [];
  wb.SheetNames.forEach((name, si) => {
    sheetNames.push(name);
    const sheet = wb.Sheets[name];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
    const nonEmpty = rows
      .map((r) => r.map((c) => String(c).trim()))
      .filter((r) => r.some((c) => c !== ""));
    if (!nonEmpty.length) return;
    // Title rows (single merged cell above the real header) become paragraphs,
    // so the table header is the first row with multiple populated cells.
    const headerIdx = nonEmpty.findIndex((r) => r.filter((c) => c !== "").length > 1);
    if (headerIdx < 0) {
      // No multi-cell structure anywhere on the sheet — plain notes/lines
      blocks.push({ kind: "heading", level: 2, text: `Sheet: ${name}`, ref: `Sheet ${si + 1}` });
      for (const r of nonEmpty) {
        const t = r.filter(Boolean).join(" ");
        if (t) blocks.push({ kind: "paragraph", text: t, ref: `Sheet "${name}" line` });
      }
      return;
    }
    const titleRows = headerIdx > 0 ? nonEmpty.slice(0, headerIdx) : [];
    const headerRow = nonEmpty[headerIdx];
    const dataRows = nonEmpty.slice(headerIdx + 1);
    for (const t of titleRows) {
      const title = t.filter(Boolean).join(" ");
      if (title) blocks.push({ kind: "paragraph", text: title, ref: `Sheet "${name}" title` });
    }
    const width = Math.max(headerRow.length, ...dataRows.map((r) => r.length), 1);
    const pad = (r: string[]) => { const c = r.slice(); while (c.length < width) c.push(""); return c; };
    blocks.push({ kind: "heading", level: 2, text: `Sheet: ${name}`, ref: `Sheet ${si + 1}` });
    blocks.push({
      kind: "table",
      header: pad(headerRow),
      rows: dataRows.map(pad),
      rowCount: dataRows.length,
      ref: `Sheet "${name}" table`,
    });
  });
  const markdown = blocksToMarkdown(blocks);
  return {
    format,
    routeNote: format === "csv" ? "CSV parsed as a single-sheet workbook" : `Workbook with ${sheetNames.length} sheet(s) — every sheet preserved as a table`,
    blocks,
    markdown,
    sheets: sheetNames,
    stats: { headings: sheetNames.length, tables: blocks.filter((b) => b.kind === "table").length, paragraphs: 0, chars: markdown.length },
  };
}

// ── PDF: per-page extraction keeps page boundaries — never merged glyph soup ──

export async function parsePdf(buffer: Buffer): Promise<DocumentIR> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages: string[] = Array.isArray(text) ? (text as string[]) : [String(text)];
  const blocks: DocBlock[] = [];
  let tableIdx = 0;
  let paraIdx = 0;
  pages.forEach((pageText, pi) => {
    const clean = (pageText || "").replace(/\u0000/g, "").trim();
    if (!clean) return;
    blocks.push({ kind: "heading", level: 2, text: `Page ${pi + 1}`, ref: `page ${pi + 1}` });
    for (const rawLine of clean.split(/\n{2,}/)) {
      const chunk = rawLine.trim();
      if (!chunk) continue;
      // Lines that repeatedly use " | " or multi-space separation read as table rows
      const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      const pipeLike = lines.filter((l) => (l.match(/\s{2,}|\s\|\s|\t/g) || []).length >= 2);
      if (pipeLike.length >= 2) {
        tableIdx++;
        const rows = pipeLike.map((l) => l.split(/\s{2,}|\s\|\s|\t/).map((c) => c.trim()).filter((c) => c !== ""));
        const width = Math.max(...rows.map((r) => r.length));
        blocks.push({
          kind: "table",
          header: [],
          rows: rows.map((r) => { const c = r.slice(); while (c.length < width) c.push(""); return c; }),
          rowCount: rows.length,
          ref: ref("Table", tableIdx) + ` (page ${pi + 1})`,
        });
      } else {
        for (const l of lines) {
          paraIdx++;
          blocks.push({ kind: "paragraph", text: l, ref: `page ${pi + 1}, ${ref("paragraph", paraIdx)}` });
        }
      }
    }
  });
  const markdown = blocksToMarkdown(blocks);
  const chars = markdown.replace(/\s/g, "").length;
  return {
    format: "pdf",
    routeNote: chars < 40 && pages.length > 0
      ? "PDF has no selectable text layer (likely a scan) — OCR is required"
      : `PDF parsed page-by-page (${pages.length} pages) — column order and page boundaries preserved`,
    blocks,
    markdown,
    pages: pages.length,
    stats: { headings: blocks.filter((b) => b.kind === "heading").length, tables: tableIdx, paragraphs: paraIdx, chars },
  };
}

// ── Images: vision OCR instructed to emit markdown tables (existing SDK) ──

export async function parseImage(buffer: Buffer, mimeType: string): Promise<DocumentIR> {
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();
  const b64 = buffer.toString("base64");
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Transcribe this document image into markdown, preserving the reading order and structure.",
              "Rules:",
              "1. Headings become '## Heading'.",
              "2. Tables become markdown pipe tables — every row stays a row, keep column alignment.",
              "3. Keep each label and its value on the same table row or same line (e.g. 'Total Calls Made | 30').",
              "4. Copy numbers EXACTLY as printed — do not compute, round or infer anything.",
              "5. Include ALL text from the top of the page to the bottom; do not skip sections.",
              "Output only the markdown transcription, no commentary.",
            ].join("\n"),
          },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
        ],
      },
    ] as never,
  });
  const content = (completion as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content || "";
  // Minimal IR from markdown OCR output
  const blocks: DocBlock[] = [];
  let tableIdx = 0;
  let paraIdx = 0;
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (/^\|.*\|$/.test(line)) {
      tableIdx++;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) rows.push(cells);
        i++;
      }
      blocks.push({ kind: "table", header: rows[0] ?? [], rows: rows.slice(1), rowCount: Math.max(0, rows.length - 1), ref: ref("Table", tableIdx) + " (OCR)" });
      continue;
    }
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ kind: "heading", level: 2, text: h[1].trim(), ref: `Heading (OCR)` });
    } else if (line) {
      paraIdx++;
      blocks.push({ kind: "paragraph", text: line, ref: `Paragraph (OCR) ${paraIdx}` });
    }
    i++;
  }
  return {
    format: "image",
    routeNote: "Image OCR (vision model) — tables transcribed as markdown structure",
    blocks,
    markdown: content.trim(),
    stats: { headings: blocks.filter((b) => b.kind === "heading").length, tables: tableIdx, paragraphs: paraIdx, chars: content.length },
  };
}

export function parseText(buffer: Buffer): DocumentIR {
  const text = buffer.toString("utf8");
  const blocks: DocBlock[] = [];
  let h = 0;
  text.split(/\n{2,}/).forEach((chunk) => {
    const t = chunk.trim();
    if (!t) return;
    if (t.length < 80 && !t.includes("\n")) {
      h++;
      blocks.push({ kind: "heading", level: 2, text: t, ref: ref("Heading", h) });
    } else {
      blocks.push({ kind: "paragraph", text: t, ref: "text body" });
    }
  });
  return {
    format: "text",
    routeNote: "Plain text — line structure preserved",
    blocks,
    markdown: text.trim(),
    stats: { headings: h, tables: 0, paragraphs: blocks.filter((b) => b.kind === "paragraph").length, chars: text.length },
  };
}
