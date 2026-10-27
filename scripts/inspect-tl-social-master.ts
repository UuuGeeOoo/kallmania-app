// Inspect the uploaded Social Media Team Lead master DOCX: dump every body
// table with row/cell text so the fill mapping can target exact cells.
import { readFileSync } from "fs";
import { editDocxCopy, bodyTables, rowsOf, cellsOf, cellText } from "@/lib/docx-template-fill";

const FILE = "/home/z/my-project/upload/SBTS-Daily-Report-Social Media Team-Lead .docx";
const buf = readFileSync(FILE);

editDocxCopy(buf, (doc) => {
  const tables = bodyTables(doc);
  console.log(`TABLES: ${tables.length}`);
  tables.forEach((t, ti) => {
    const rows = rowsOf(t);
    console.log(`\n=== TABLE ${ti} — ${rows.length} rows ===`);
    rows.forEach((tr, ri) => {
      const cells = cellsOf(tr);
      const texts = cells.map((c) => JSON.stringify(cellText(c).slice(0, 60)));
      console.log(`  r${ri} (${cells.length}c): ${texts.join(" | ")}`);
    });
  });
  // also non-table paragraphs (headings live outside tables?)
  const paras = (doc as { bodyParas?: () => string[] }).bodyParas?.() ?? [];
  if (paras.length) console.log("\nPARAS:", paras.slice(0, 30));
});
console.log("\nDONE");
