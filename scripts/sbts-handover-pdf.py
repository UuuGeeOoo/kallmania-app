# SBTS x Kallmania integration handover - body PDF (ReportLab) + cover merge.
# Template 07 Crystal Blue body palette (fixed, per typesetting/cover.md).
# English document -> FreeSerif body, DejaVuSans (mono) for code/credentials.
import os, sys, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Table, TableStyle, KeepTogether, CondPageBreak, HRFlowable)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
sys.path.insert(0, os.path.join(PDF_SKILL_DIR, "scripts"))
from pdf import install_font_fallback

FONT_DIR = "/usr/share/fonts"
pdfmetrics.registerFont(TTFont("NotoSerifSC", f"{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf"))
pdfmetrics.registerFont(TTFont("NotoSerifSC-Bold", f"{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif", f"{FONT_DIR}/truetype/freefont/FreeSerif.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-Bold", f"{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-Italic", f"{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf"))
pdfmetrics.registerFont(TTFont("FreeSerif-BoldItalic", f"{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf"))
pdfmetrics.registerFont(TTFont("DejaVuSans", f"{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf"))
registerFontFamily("NotoSerifSC", normal="NotoSerifSC", bold="NotoSerifSC-Bold")
registerFontFamily("FreeSerif", normal="FreeSerif", bold="FreeSerif-Bold", italic="FreeSerif-Italic", boldItalic="FreeSerif-BoldItalic")
registerFontFamily("DejaVuSans", normal="DejaVuSans", bold="DejaVuSans")
install_font_fallback()

# -- Template 07 Crystal Blue body palette (fixed values from cover.md) -------
PAGE_BG      = colors.HexColor("#f5f8fc")   # XL
SECTION_BG   = colors.HexColor("#edf2f9")   # XL
CARD_BG      = colors.HexColor("#e4ecf5")   # L
TABLE_STRIPE = colors.HexColor("#eef3fa")   # L
HEADER_FILL  = colors.HexColor("#1a4a7a")   # M
BORDER       = colors.HexColor("#c0d0e2")   # S
ACCENT       = colors.HexColor("#2d7ab3")   # XS
TEXT_PRIMARY = colors.HexColor("#142840")
TEXT_MUTED   = colors.HexColor("#5a7a96")
TABLE_HEADER_COLOR = HEADER_FILL
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD  = TABLE_STRIPE

MARGIN = 0.9 * inch
PAGE_W, PAGE_H = A4
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - 2 * MARGIN
OUT_BODY = "/tmp/sbts-body.pdf"
OUT_FINAL = "/home/z/my-project/download/SBTS_integration_handover_v1.pdf"
DOC_TITLE = "SBTS Media Command Centre - Kallmania Performance Integration Handover (Protocol v1)"

# -- Styles -------------------------------------------------------------------
h1 = ParagraphStyle("H1", fontName="FreeSerif", fontSize=17, leading=22, textColor=HEADER_FILL, spaceBefore=18, spaceAfter=4)
h2 = ParagraphStyle("H2", fontName="FreeSerif", fontSize=12.5, leading=17, textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=6)
body = ParagraphStyle("Body", fontName="FreeSerif", fontSize=10.5, leading=16.5, textColor=TEXT_PRIMARY, alignment=TA_JUSTIFY, spaceAfter=8)
bullet_style = ParagraphStyle("Bullet", fontName="FreeSerif", fontSize=10.5, leading=16, textColor=TEXT_PRIMARY, alignment=TA_LEFT, leftIndent=14, spaceAfter=4)

def bullet(text):
    return Paragraph(text, bullet_style)
cell = ParagraphStyle("Cell", fontName="FreeSerif", fontSize=9.3, leading=13, textColor=TEXT_PRIMARY, alignment=TA_LEFT)
cell_c = ParagraphStyle("CellC", parent=cell, alignment=TA_CENTER)
cell_h = ParagraphStyle("CellH", fontName="FreeSerif", fontSize=9.3, leading=13, textColor=colors.white, alignment=TA_CENTER)
caption = ParagraphStyle("Caption", fontName="FreeSerif", fontSize=8.5, leading=12, textColor=TEXT_MUTED, alignment=TA_CENTER, spaceBefore=3, spaceAfter=6)
code_style = ParagraphStyle("Code", fontName="DejaVuSans", fontSize=8.0, leading=11.6, textColor=TEXT_PRIMARY, alignment=TA_LEFT)
mono_note = ParagraphStyle("MonoNote", fontName="DejaVuSans", fontSize=8.6, leading=13, textColor=TEXT_PRIMARY, alignment=TA_LEFT)
toc_title = ParagraphStyle("TocTitle", fontName="FreeSerif", fontSize=17, leading=22, textColor=HEADER_FILL, spaceAfter=14)

AMP, LT, GT = chr(38), chr(60), chr(62)

def esc(s: str) -> str:
    return (s.replace(AMP, AMP + "amp;")
             .replace(LT, AMP + "lt;")
             .replace(GT, AMP + "gt;"))

# -- TOC doc template ----------------------------------------------------------
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, "bookmark_name"):
            level = getattr(flowable, "bookmark_level", 0)
            text = getattr(flowable, "bookmark_text", "")
            key = getattr(flowable, "bookmark_key", "")
            # TOC pages are numbered in the footer's ARABIC body sequence (raw page - 1:
            # raw page 1 is the roman-numbered TOC itself) - report the same numbers.
            self.notify("TOCEntry", (level, text, self.page - 1, key))

def add_heading(text, style, level=0):
    key = "h_%s" % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/><b>%s</b>' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

H1_RULE = HRFlowable(width="100%", color=ACCENT, thickness=1.2, spaceBefore=0, spaceAfter=10)

def section(story, num, title):
    story.append(CondPageBreak(AVAIL_H * 0.25))
    story.append(KeepTogether([add_heading(f"{num}. {title}", h1, 0), H1_RULE]))

def sub(story, num, title):
    story.append(add_heading(f"{num} {title}", h2, 1))

# -- Page decorator: tinted page bg + header/footer -----------------------------
def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    # header
    canvas.setFont("FreeSerif", 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 0.55 * inch, "SBTS x Kallmania - Performance Integration Handover (v1)")
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.2)
    canvas.line(MARGIN, PAGE_H - 0.62 * inch, PAGE_W - MARGIN, PAGE_H - 0.62 * inch)
    # footer
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, 0.62 * inch, PAGE_W - MARGIN, 0.62 * inch)
    canvas.setFont("FreeSerif", 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 0.45 * inch, "Kallmania Operations Platform - Engineering")
    page_label = "i" if doc.page == 1 else str(doc.page - 1)  # front matter roman, body arabic reset
    canvas.drawRightString(PAGE_W - MARGIN, 0.45 * inch, page_label)
    canvas.restoreState()

# -- helpers --------------------------------------------------------------------
def make_table(headers, rows, ratios, align_center_cols=None):
    align_center_cols = align_center_cols or set()
    col_w = [r * AVAIL_W for r in ratios]
    assert abs(sum(ratios) - 1.0) < 0.001 and sum(col_w) <= AVAIL_W + 0.5
    data = [[Paragraph(f"<b>{esc(h)}</b>", cell_h) for h in headers]]
    for row in rows:
        data.append([
            Paragraph(esc(c), cell_c if i in align_center_cols else cell)
            for i, c in enumerate(row)
        ])
    t = Table(data, colWidths=col_w, hAlign="CENTER", repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        style.append(("BACKGROUND", (0, i), (-1, i), TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD))
    t.setStyle(TableStyle(style))
    return t

def code_block(lines):
    paras = [Paragraph(esc(l) if l else " ", code_style) for l in lines]
    inner = Table([[p] for p in paras], colWidths=[AVAIL_W * 0.94])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return inner

def callout(title, text):
    inner = Table(
        [[Paragraph(f"<b>{esc(title)}</b>", ParagraphStyle("ct", parent=cell, fontSize=9.6, leading=13.5, textColor=HEADER_FILL))],
         [Paragraph(text, ParagraphStyle("cb", parent=cell, fontSize=9.3, leading=13.5))]],
        colWidths=[AVAIL_W * 0.94])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
        ("BOX", (0, 0), (-1, -1), 1, ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
    ]))
    return inner

BASE = "https://" + LT + "kallmania-host" + GT

# ==============================================================================
story = []

# TOC page
story.append(Paragraph("<b>Table of Contents</b>", toc_title))
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle("TOC1", fontName="FreeSerif", fontSize=11, leading=18, leftIndent=6, textColor=TEXT_PRIMARY),
    ParagraphStyle("TOC2", fontName="FreeSerif", fontSize=9.5, leading=15, leftIndent=24, textColor=TEXT_MUTED),
]
story.append(toc)
story.append(PageBreak())

# ── 1. Integration overview ──────────────────────────────────────────────────
section(story, 1, "Integration Overview and Deliverables")
story.append(Paragraph(
    "The SBTS Media Command Centre computes each media agent's daily performance score in real time from tasks, "
    "check-ins, punctuality, published posts and end-of-day reports, and it owns both the scoring formula and the "
    "event format. Kallmania has built the receiving side of that pipe: a hardened HTTPS ingest endpoint that "
    "verifies every event, stores it idempotently, and surfaces the results on a live scoreboard scoped to each "
    "viewer's role. This document is the operational handover the Command Centre asked for - the five deliverables, "
    "the versioned payload contract, the machine credentials, and the ground rules both sides work under.", body))
story.append(Paragraph(
    "Everything described here is deployed and verified on the running production system. The verification summary in "
    "section 8 lists the exact end-to-end suites that were executed against the live server, including a signed "
    "round-trip with the production credential itself. The five requested deliverables map to this document as follows.", body))
story.append(Spacer(1, 6))
story.append(make_table(
    ["#", "Deliverable requested", "Where it lives"],
    [
        ["1", "HTTPS ingest endpoint, idempotent on eventId, fast 200", "Section 2 - POST /api/integrations/sbts/v1/events"],
        ["2", "API key checked in Authorization: Bearer, rotatable on request", "Section 4 - issued, sha256-stored, rotation with grace window"],
        ["3", "Shared HMAC secret; X-SBTS-Signature / X-SBTS-Timestamp with 5-minute freshness", "Sections 2 and 4 - issuance and verification rules"],
        ["4", "Agent email list with Division mapping", "Section 5 - roster table (also delivered as an Excel workbook)"],
        ["5", "Health endpoint for pipe monitoring", "Section 6 - GET /api/integrations/sbts/v1/health"],
    ],
    [0.06, 0.47, 0.47], align_center_cols={0}))
story.append(Paragraph("Table 1 - The five deliverables and where each is specified.", caption))
story.append(callout("Payload contract governance",
    "The event format in section 3 is protocol version v1 and is frozen. Any change requires a new version "
    "(a /api/integrations/sbts/v2/... route family) plus advance notice to both sides - silent edits never happen. "
    "Display adjustments on the Kallmania side are always welcome; formula changes are out of scope for this "
    "integration by design."))

# ── 2. Ingest endpoint ───────────────────────────────────────────────────────
section(story, 2, "Ingest Endpoint Specification")
sub(story, "2.1", "Endpoint and authentication")
story.append(Paragraph(
    f"Events are pushed to <font name='DejaVuSans' size='9'>POST {BASE}/api/integrations/sbts/v1/events</font> over HTTPS. "
    "The request body is UTF-8 JSON - either a single event object or a batch envelope "
    "<font name='DejaVuSans' size='9'>{{\"events\": [...]}}</font> of at most 100 events. Authentication is threefold, "
    "checked in this strict order: the bearer API key (section 4), the timestamp freshness window, and the HMAC "
    "signature computed over the exact raw request body.", body))
story.append(Spacer(1, 4))
story.append(make_table(
    ["Header", "Value", "Rule"],
    [
        ["Authorization", "Bearer <API key>", "Required. Checked against a SHA-256 digest of the key - the plaintext key is never stored server-side."],
        ["X-SBTS-Timestamp", "Unix seconds (or milliseconds)", "Required. Requests with |now - timestamp| greater than 300 seconds are rejected as stale (5-minute window, per contract)."],
        ["X-SBTS-Signature", "hex hmac_sha256(secret, rawBody)", "Required. Lowercase hex, a leading 'sha256=' prefix is tolerated. Compared in constant time against the HMAC of the exact raw body bytes."],
    ],
    [0.20, 0.26, 0.54]))
story.append(Paragraph("Table 2 - Required authentication headers.", caption))
story.append(Paragraph("The signature recipe on the SBTS side is three lines of code:", body))
story.append(code_block([
    "raw  = request.body  // exact UTF-8 bytes as sent - do not re-serialize",
    "ts   = Math.floor(Date.now() / 1000)",
    "sig  = HMAC_SHA256(secret, raw)  // lowercase hex",
    "// headers:",
    "//   Authorization: Bearer <API key>",
    "//   X-SBTS-Timestamp: 1730643512",
    "//   X-SBTS-Signature: 9f2ac8...e01  (or sha256=9f2ac8...e01)",
]))
story.append(Spacer(1, 6))
sub(story, "2.2", "Responses, idempotency and error handling")
story.append(Paragraph(
    "Once authenticated, the endpoint always responds quickly with HTTP 200 and a per-item result list - a bad event "
    "never breaks the pipe. Duplicate eventId values are skipped, never re-processed: the first stored copy wins, which "
    "makes retries and at-least-once delivery safe. Malformed JSON, an empty body, or a batch above 100 events fail "
    "fast with 400 before any event is processed.", body))
story.append(make_table(
    ["HTTP status", "When", "Body"],
    [
        ["200", "Authenticated; every item individually reported", '{"ok":true,"version":"v1","accepted":n,"duplicates":n,"rejected":n,"results":[...]}'],
        ["400", "Malformed JSON, empty body, batch larger than 100 events", '{"error":"..."}'],
        ["401", "Missing/unknown/revoked key, stale timestamp (over 300 s skew), bad or missing signature", '{"error":"..."}'],
        ["413", "Body larger than 1 MB", '{"error":"Body too large (max 1 MB per request)"}'],
        ["500", "Unexpected server error (should not occur; retries are safe due to idempotency)", '{"error":"..."}'],
    ],
    [0.14, 0.50, 0.36]))
story.append(Paragraph("Table 3 - Response codes. Every 200 result item carries eventId, status (stored / duplicate / rejected), and an error message for rejected items.", caption))
story.append(callout("Idempotency guarantee",
    "eventId is the deduplication key and is unique forever. Re-sending an event with the same eventId returns "
    "status \"duplicate\" and leaves the stored copy untouched - so SBTS can retry aggressively after network "
    "failures without ever double-counting a score or duplicating a report."))

# ── 3. Payload contract v1 ───────────────────────────────────────────────────
section(story, 3, "Payload Contract - v1")
sub(story, "3.1", "Common envelope and validation rules")
story.append(Paragraph(
    "Both event types share the same envelope. Unknown extra fields are tolerated and preserved in the raw payload "
    "audit copy, so adding informational fields on the SBTS side never breaks the pipe - only the contract fields "
    "below are interpreted.", body))
story.append(make_table(
    ["Field", "Type", "Required", "Rules"],
    [
        ["eventId", "string", "yes", "1-128 chars, no control characters, unique forever (idempotency key)."],
        ["type", "string", "yes", "Exactly 'performance.score' or 'daily.report'."],
        ["agent.email", "string", "yes", "Valid email, max 254 chars. Matched to Kallmania accounts case-insensitively; send exactly as in the section 5 roster."],
        ["date", "string", "yes", "The performance/report business date, YYYY-MM-DD, calendar-valid, at most 2 days in the future."],
        ["sentAt", "string", "no", "ISO-8601 sender timestamp, informational. Freshness enforcement uses the X-SBTS-Timestamp header."],
    ],
    [0.16, 0.10, 0.11, 0.63]))
story.append(Paragraph("Table 4 - Common envelope fields (v1).", caption))
story.append(make_table(
    ["Event type", "Extra contract fields", "Validation"],
    [
        ["performance.score", "score (number), delta (number, optional), components (object, optional)", "score required, finite, 0-100. delta finite if present. components: max 25 keys, every value a finite number (points)."],
        ["daily.report", "report (string)", "Required, non-empty, max 20,000 characters."],
    ],
    [0.20, 0.36, 0.44]))
story.append(Paragraph("Table 5 - Per-type fields (v1).", caption))
sub(story, "3.2", "Sample payloads")
story.append(code_block([
    "{",
    '  "eventId": "sbts-20261104-000123",',
    '  "type": "performance.score",',
    '  "agent": { "email": "nchimamkpam@kallmania.com" },',
    '  "date": "2026-11-04",',
    '  "score": 78.5,',
    '  "delta": 2.1,',
    '  "components": { "tasks": 20, "checkIns": 15, "punctuality": 12,',
    '                  "publishedPosts": 18, "eodReport": 13.5 },',
    '  "sentAt": "2026-11-04T09:35:12Z"',
    "}",
]))
story.append(Paragraph("Sample 1 - performance.score event.", caption))
story.append(code_block([
    "{",
    '  "eventId": "sbts-20261104-r000123",',
    '  "type": "daily.report",',
    '  "agent": { "email": "opeace@kallmania.com" },',
    '  "date": "2026-11-04",',
    '  "report": "Ran the morning engagement loop, published 4 creatives, ...",',
    '  "sentAt": "2026-11-04T18:05:00Z"',
    "}",
]))
story.append(Paragraph("Sample 2 - daily.report event.", caption))
story.append(code_block([
    "HTTP/1.1 200 OK",
    "{",
    '  "ok": true,',
    '  "version": "v1",',
    '  "accepted": 1,',
    '  "duplicates": 0,',
    '  "rejected": 0,',
    '  "results": [ { "eventId": "sbts-20261104-000123",',
    '                 "status": "stored", "mapped": true } ]',
    "}",
]))
story.append(Paragraph("Sample 3 - ingest success response (mapped = the email matched a Kallmania account).", caption))
story.append(Paragraph(
    "Unmapped agent emails are still stored and flagged (mapped: false, matched = false server-side) so nothing is "
    "lost while rosters are reconciled; administrators see the unmapped list on the scoreboard. Component names such "
    "as tasks, checkIns, punctuality, publishedPosts and eodReport are owned by the Media Command Centre - Kallmania "
    "displays them verbatim and never recomputes them.", body))

# ── 4. Credentials & rotation ────────────────────────────────────────────────
section(story, 4, "Credentials and Rotation")
story.append(Paragraph(
    "The two credential values below are the production machine credentials for the SBTS Media Command Centre. "
    "Share them over a secure channel (never by plain email), and treat the HMAC secret with the same care as a "
    "signing key: anyone holding it can forge valid events until the next rotation.", body))
story.append(Spacer(1, 6))
# Credential material shown in the handover table - read from the environment
# (server .env, gitignored); NEVER hardcode production credentials in the repo.
SBTS_KEY = os.environ.get("SBTS_API_KEY", "<to-be-filled-from-env>")
SBTS_SECRET = os.environ.get("SBTS_HMAC_SECRET", "<to-be-filled-from-env>")

cred_rows = [
    [Paragraph("<b>API key</b> (Authorization: Bearer)", cell),
     Paragraph(SBTS_KEY, mono_note),
     Paragraph("48 chars, CSPRNG. Stored server-side only as a SHA-256 digest.", cell)],
    [Paragraph("<b>HMAC secret</b> (signing key)", cell),
     Paragraph(SBTS_SECRET, mono_note),
     Paragraph("64 hex chars, CSPRNG. Held server-side for signature verification.", cell)],
]
cred_t = Table(cred_rows, colWidths=[0.22 * AVAIL_W, 0.46 * AVAIL_W, 0.32 * AVAIL_W], hAlign="CENTER")
cred_t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
    ("BOX", (0, 0), (-1, -1), 1, ACCENT),
    ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
]))
story.append(cred_t)
story.append(Paragraph("Table 6 - Production credential material (shown once; the plaintext API key is not stored server-side).", caption))
sub(story, "4.1", "Rotation on request")
story.append(Paragraph(
    "Rotation is available on request at any time, and takes effect without downtime. When a rotation is performed, "
    "a new key and secret are minted and the previous credential enters a grace window (24 hours by default, "
    "configurable, or immediate with grace 0) during which events signed with the old secret keep flowing. That means "
    "the Command Centre can swap credentials during the window without dropping a single event. Because the API key "
    "is stored only as a digest, a rotated key is displayed exactly once at rotation time - copy it immediately.", body))
story.append(bullet("\u2022 Administrator path: SBTS Scores view, Integration pipe (admin) card, Rotate button (24-hour grace)."))
story.append(bullet("\u2022 API path (admin session): POST /api/integrations/sbts/v1/credentials with {\"action\":\"rotate\",\"graceHours\":24}."))
story.append(bullet("\u2022 Server CLI: bun scripts/sbts-credentials.ts rotate [graceHours] (or status to inspect)."))
story.append(Spacer(1, 4))
story.append(callout("Compromise handling",
    "If either value is suspected compromised, request an immediate rotation with grace 0: the old credential stops "
    "verifying that instant and the new pair is issued in the same operation."))

# ── 5. Agent email roster ────────────────────────────────────────────────────
section(story, 5, "Agent Email Roster (Deliverable 4)")
story.append(Paragraph(
    "The Command Centre maps its members to Kallmania accounts by exact email match (case-insensitive). The current "
    "Social Media and Campaign division roster is below - the same list is delivered as "
    "kallmania_media_agents_roster.xlsx with an explicit do-not-map sheet for internal test fixtures. New agents "
    "registered on Kallmania will be appended and announced before taking effect.", body))
story.append(make_table(
    ["Email (exact match key)", "Name", "Role", "Division", "Team", "Location"],
    [
        ["asomto@kallmania.com", "Somtochukwu Prosper Ali", "Team Lead", "Social Media & Campaign", "SOCIAL", "Enugu, NG"],
        ["nchimamkpam@kallmania.com", "NZE CHIMAMKPAM EJIMOFOR", "Agent", "Social Media & Campaign", "SOCIAL", "Enugu, NG"],
        ["opeace@kallmania.com", "Otubelu Peace Chidiebube", "Agent", "Social Media & Campaign", "SOCIAL", "Enugu, NG"],
    ],
    [0.24, 0.23, 0.10, 0.19, 0.11, 0.13], align_center_cols={2, 4}))
story.append(Paragraph("Table 7 - Operational roster (all APPROVED accounts).", caption))
story.append(Paragraph(
    "Data correction applied on 3 November 2026: the account opeace@kallmainia.com carried a typo domain "
    "(kallmainia instead of kallmania) and was corrected to opeace@kallmania.com. Always use the address in Table 7 - "
    "the old spelling would silently fail the exact-match rule. Division 'Social Media & Campaign' corresponds to "
    "Kallmania department SOCIAL_MEDIA, team SOCIAL. Internal automated-test accounts under the kallmania.test "
    "domain are excluded from the roster and should never be mapped.", body))

# ── 6. Health & monitoring ───────────────────────────────────────────────────
section(story, 6, "Health Endpoint and Monitoring")
story.append(Paragraph(
    f"<font name='DejaVuSans' size='9'>GET {BASE}/api/integrations/sbts/v1/health</font> is public (no authentication) "
    "and exists for the Command Centre's uptime monitor. It performs a live database round-trip: while the service "
    "answers and the database is reachable it returns 200 with status ok; if the database check fails it returns 503 "
    "with status degraded. Alert on any non-200 status code or on status other than ok.", body))
story.append(code_block([
    "GET /api/integrations/sbts/v1/health",
    "HTTP/1.1 200 OK",
    "{",
    '  "status": "ok",',
    '  "service": "sbts-ingest",',
    '  "version": "v1",',
    '  "time": "2026-11-03T16:28:51.710Z"',
    "}",
]))
story.append(Paragraph("Sample 4 - healthy response. version echoes the current ingest protocol.", caption))
story.append(Paragraph(
    "Availability: the Kallmania application is served over HTTPS 24/7 from its production host; the live base URL is "
    "provided with this handover (the " + LT + "kallmania-host" + GT + " placeholder above). If the hosting endpoint ever changes, "
    "the Command Centre will be given advance notice together with the new base URL; the paths and contract in this "
    "document do not change.", body))

# ── 7. Display integration ───────────────────────────────────────────────────
section(story, 7, "Display Integration on Kallmania")
story.append(Paragraph(
    "The SBTS Scores view is live in the Kallmania web app for media staff, team leads and management. Each agent's "
    "latest score renders as a horizontal 0-100 bar that animates up and down whenever a new event lands (the view "
    "polls every 30 seconds and on manual refresh), with a trend chip showing the SBTS-provided delta, the previous "
    "score marked on the bar for context, and the component breakdown as chips. Daily reports are listed under the "
    "scoreboard with full expandable text.", body))
story.append(make_table(
    ["Viewer", "Scores visible", "Daily reports visible"],
    [
        ["Social media agent (SOCIAL_MEDIA)", "Own entry only - matched by account email", "Own reports only, enforced server-side (the email parameter is ignored for agents)"],
        ["Team lead (TEAM_LEAD, SOCIAL team)", "All agents of their team", "All reports of their team; other teams' emails are rejected with 403"],
        ["Supervisor / Administrator", "All media agents plus any unmapped event emails (flagged for reconciliation)", "All divisions, optionally filtered by email and date range"],
        ["Other roles (e.g. call-centre agents)", "No access - 403", "No access - 403"],
    ],
    [0.28, 0.34, 0.38]))
story.append(Paragraph("Table 8 - Visibility scoping matrix (server-side enforcement on /api/sbts/scores and /api/sbts/reports).", caption))
story.append(Paragraph(
    "Scores shown on the scoreboard are exactly what the Command Centre pushed - Kallmania stores and displays, and "
    "does not recompute or rescale them. The latest score per agent is the event with the most recent business date, "
    "tie-broken by most recently received, so a corrected same-day push always wins.", body))

# ── 8. Governance & verification ─────────────────────────────────────────────
section(story, 8, "Governance, Ground Rules and Verification")
sub(story, "8.1", "Ground rules acknowledged")
story.append(bullet("\u2022 Contract v1 is frozen; changes ship only as a new version with advance notice - never silent edits."))
story.append(bullet("\u2022 Scoring and the event format are owned by the Media Command Centre; Kallmania stores, displays and scopes - it never recomputes."))
story.append(bullet("\u2022 The ingest endpoint is publicly reachable over HTTPS around the clock and responds 200 quickly once authenticated."))
story.append(bullet("\u2022 Rotation of the key and secret is available on request, with a zero-downtime grace window."))
sub(story, "8.2", "Verification evidence (executed on the live production server)")
story.append(Paragraph(
    "The integration is verified by three automated suites executed against the running production build, all green: "
    "a 45-check API end-to-end suite (security gates: missing/unknown/revoked key, bad signature, stale and future "
    "timestamps; idempotency; per-item validation; batch semantics; unmapped-email handling; display scoping for "
    "agents, leads, supervisors and outsiders; rotation with grace and immediate revocation), a 14-check real-browser "
    "suite (agent hero card with animated bar, delta and component chips; own-report isolation; admin division grid; "
    "integration pipe card and rotation button), and a live signed round-trip with the production credential "
    "(health 200 ok, event stored and mapped, replay correctly reported as duplicate). Type checking passes with "
    "zero errors and the existing Operational Intelligence suite was re-run as a regression canary - all checks pass.", body))
story.append(Spacer(1, 4))
story.append(callout("Getting started",
    "1. Store the two credential values from section 4 in the Command Centre's secret store. 2. Sign and push a first "
    "performance.score event for a roster email from section 5. 3. Watch it appear on the Kallmania scoreboard within "
    "30 seconds. 4. Point the uptime monitor at the health endpoint from section 6."))
sub(story, "8.3", "Support and change requests")
story.append(Paragraph(
    "Three operational request paths are standing. Rotation requests: ask for a key or secret rotation at any time "
    "and state the desired grace window (24 hours by default, or immediate); the new credential pair is issued and "
    "the swap is completed without downtime on either side. Roster changes: new media agents are registered on "
    "Kallmania by the operations team, then announced and appended to the section 5 list so the exact-match mapping "
    "stays intentional - unmapped event emails are stored and flagged in the meantime, never dropped. Contract "
    "questions: any change SBTS needs to the v1 payload starts a v2 discussion with joint advance notice before "
    "either side cuts over; both teams keep their current pipelines untouched while a new version is rolled out. "
    "For incidents (repeated 401s after a known rotation, unexpected 5xx, or a stalled pipe detected by the health "
    "monitor), the first diagnostic is always the health endpoint and the per-item error strings in the ingest "
    "response, which name the exact failing rule.", body))

# -- build ---------------------------------------------------------------------
doc = TocDocTemplate(OUT_BODY, pagesize=A4,
                     leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN,
                     title=DOC_TITLE, author="Z.ai", creator="Z.ai",
                     subject="SBTS Media Command Centre integration handover - ingest endpoints, v1 contract, credentials, roster, health")
doc.multiBuild(story, onFirstPage=on_page, onLaterPages=on_page)
print("BODY BUILT:", OUT_BODY)

# -- merge cover + body ----------------------------------------------------------
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.2 or abs(h - A4_H) > 0.2:
        page.scale_to(A4_W, A4_H)
    return page

writer = PdfWriter()
writer.add_page(normalize_page_to_a4(PdfReader("/tmp/sbts-cover.pdf").pages[0]))
for page in PdfReader(OUT_BODY).pages:
    writer.add_page(normalize_page_to_a4(page))
writer.add_metadata({"/Title": DOC_TITLE, "/Author": "Z.ai", "/Creator": "Z.ai",
                     "/Subject": "SBTS Media Command Centre integration handover - protocol v1"})
with open(OUT_FINAL, "wb") as f:
    writer.write(f)
print("FINAL:", OUT_FINAL)
