# SBTS handover — Kallmania media agent email roster (exact-email mapping list).
# Two sheets: the operational roster SBTS should map against, plus internal
# test accounts explicitly marked "do not map".
import sys, os
XLSX_SKILL_DIR = "/home/z/my-project/skills/xlsx"
for sub in [XLSX_SKILL_DIR, os.path.join(XLSX_SKILL_DIR, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)
from base import *  # noqa: F401,F403 — design tokens + style helpers
from openpyxl import Workbook

wb = Workbook()

# ── Sheet 1: Agent roster (the mapping list) ────────────────────────────────
ws = wb.active
ws.title = "Agent Roster"
headers = ["Email (exact match key)", "Full Name", "Role", "Division", "Team", "Location", "Status"]
last_col = len(headers) + 1
setup_sheet(ws, title="Kallmania - Social Media & Campaign Division (for SBTS mapping)", last_col=last_col)

for col_idx, h in enumerate(headers, start=2):
    ws.cell(row=4, column=col_idx, value=h)
style_header_row(ws, row_num=4, col_start=2, col_end=last_col)

roster = [
    ["asomto@kallmania.com", "Somtochukwu Prosper Ali", "Team Lead", "Social Media & Campaign", "SOCIAL", "Enugu, NG", "APPROVED"],
    ["nchimamkpam@kallmania.com", "NZE CHIMAMKPAM EJIMOFOR", "Agent", "Social Media & Campaign", "SOCIAL", "Enugu, NG", "APPROVED"],
    ["opeace@kallmania.com", "Otubelu Peace Chidiebube", "Agent", "Social Media & Campaign", "SOCIAL", "Enugu, NG", "APPROVED"],
]
for i, row_data in enumerate(roster):
    row_num = 5 + i
    for col_idx, value in enumerate(row_data, start=2):
        ws.cell(row=row_num, column=col_idx, value=value)
    style_data_row(ws, row_num=row_num, col_start=2, col_end=last_col, row_index=i)

note_row = 5 + len(roster) + 2
notes = [
    "Mapping rule: events are matched to accounts by EXACT email match (case-insensitive). Send agent.email exactly as listed above.",
    "Division 'Social Media & Campaign' = Kallmania department SOCIAL_MEDIA, team SOCIAL.",
    "Data correction (2026-11-03): opeace@kallmainia.com (typo domain) was corrected to opeace@kallmania.com - always use the address above.",
    "New media agents registered on Kallmania will be appended to this list; any change is announced before it takes effect.",
]
for j, t in enumerate(notes):
    c = ws.cell(row=note_row + j, column=2, value=t)
    c.font = font_caption()
auto_fit_columns(ws, min_width=8, max_width=40, header_row=4, data_start_row=5)
ws.sheet_view.showGridLines = False

# ── Sheet 2: Internal test accounts (do not map) ────────────────────────────
ws2 = wb.create_sheet("Internal Test Accounts")
headers2 = ["Email", "Full Name", "Role", "Purpose"]
last_col2 = len(headers2) + 1
setup_sheet(ws2, title="Kallmania internal test accounts - DO NOT MAP", last_col=last_col2)
for col_idx, h in enumerate(headers2, start=2):
    ws2.cell(row=4, column=col_idx, value=h)
style_header_row(ws2, row_num=4, col_start=2, col_end=last_col2)

tests = [
    ["img-e2e-soc@kallmania.test", "E2E Image Social Agent", "Agent", "Automated upload pipeline test fixture"],
    ["teamfmt-social@kallmania.test", "E2E TeamFmt Social Agent", "Agent", "Team report format test fixture"],
    ["teamfmt-tl@kallmania.test", "E2E TeamFmt Social Lead", "Team Lead", "Team report format test fixture"],
    ["uibrowser-social@kallmania.test", "E2E Browser Social", "Agent", "Browser UI test fixture"],
]
for i, row_data in enumerate(tests):
    row_num = 5 + i
    for col_idx, value in enumerate(row_data, start=2):
        ws2.cell(row=row_num, column=col_idx, value=value)
    style_data_row(ws2, row_num=row_num, col_start=2, col_end=last_col2, row_index=i)

n2 = 5 + len(tests) + 2
c = ws2.cell(row=n2, column=2, value="These accounts belong to Kallmania's automated verification suites. Events carrying these emails are ignored for performance reporting.")
c.font = font_caption()
auto_fit_columns(ws2, min_width=8, max_width=44, header_row=4, data_start_row=5)
ws2.sheet_view.showGridLines = False

wb.properties.creator = "Z.ai"
wb.properties.title = "Kallmania Social Media Agent Roster - SBTS Mapping"
out = "/home/z/my-project/download/kallmania_media_agents_roster.xlsx"
wb.save(out)
print("SAVED:", out)
