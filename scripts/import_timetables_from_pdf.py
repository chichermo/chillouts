#!/usr/bin/env python3
"""
Importeer docenten per lesuur uit Untis-PDF (2526 Klassen.pdf) naar Supabase timetables.

Vereist: pip install pdfplumber pypdf supabase-py
Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

Gebruik:
  python scripts/import_timetables_from_pdf.py [--dry-run] [pad/naar/pdf]
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import pdfplumber
import pypdf
from supabase import create_client

YEAR = "2025-2026"
DEFAULT_PDF = Path(__file__).resolve().parent.parent / "2526 Klassen.pdf"

# PDF-pagina (1-based) -> klasnaam in de app (students.klas)
PAGE_TO_KLAS: dict[int, str] = {
    1: "1 Aarde",
    3: "1 Lucht",
    4: "1 Vuur",
    5: "1 Water",
    6: "2 Aarde",  # PDF: 2Luc 2B Food - Create
    10: "2 Vuur",  # PDF: 2Wat 2Water Move (locatie Vuur)
    11: "3 MA",  # PDF: 3Art
    12: "3 MGB",  # PDF: 3Busi 3Business
    13: "3/4 Create",
    14: "3 Food",
    16: "3/4 Move & Play",
    17: "4 MA",
    18: "4 MGB",
    20: "4 FOOD",
    23: "5 Bus",
    24: "5 Create",
    25: "5 Food",
    26: "5/6 Move",
    27: "5 move & Play",
    28: "6 Create",
    29: "6 Food",
    30: "5/6 Move",  # merge met p26
}

LOCATION_LINE = re.compile(r"^(Aarde|Water|Vuur|Lucht)\s+\d+", re.I)
ROOM_ONLY = re.compile(r"^(KK\d+|FITNESS|\?)$", re.I)


def timetable_id(year: str, klas: str) -> str:
    return f"timetable_{year}_{klas.replace(' ', '_')}"


def slot_key(day_index: int, hour: int) -> str:
    return f"{day_index}_{hour}"


def clean_teacher_name(name: str) -> str:
    name = name.strip().lstrip("*").strip()
    name = re.sub(r"\s+", " ", name)
    return name


def extract_teacher(cell: str | None) -> str:
    if not cell or not str(cell).strip():
        return ""
    lines = [line.strip() for line in str(cell).split("\n") if line.strip()]
    for line in lines:
        if LOCATION_LINE.match(line) or ROOM_ONLY.match(line):
            continue
        m = re.search(r"SCHAKE\s+\*?([A-Za-z]+)", line)
        if m:
            return clean_teacher_name(m.group(1))
        # SUBJECT Teacher.  (bv. LIFE Lisa F.)
        m = re.match(r"^[A-Z][A-Z&+0-9]*\s+(\*?[A-Za-z][\w\s]*?)\.?\s*$", line)
        if m:
            return clean_teacher_name(m.group(1))
        # Teacher.SUBJECT (bv. Gert.ENG)
        m = re.match(r"^(\*?[A-Za-z][\w\s]*?)\.[A-Z]", line)
        if m:
            return clean_teacher_name(m.group(1))
        # TeacherSUBJECT (bv. PascaleNED)
        compact = line.replace(" ", "")
        m = re.match(r"^(\*?[A-Za-z]+)[A-Z]{2,}", compact)
        if m:
            return clean_teacher_name(m.group(1))
    return ""


def parse_hour_from_row(row: list) -> int | None:
    if not row or not row[0]:
        return None
    first = str(row[0]).strip()
    m = re.match(r"^(\d+)\s", first)
    if m:
        hour = int(m.group(1))
        if 1 <= hour <= 7:
            return hour
    return None


def find_main_table(page) -> list[list] | None:
    tables = page.extract_tables() or []
    for table in tables:
        if not table or len(table) < 2:
            continue
        header = [str(c or "").strip() for c in table[0]]
        if any("Maandag" in h for h in header) and any("Vrijdag" in h for h in header):
            return table
    return tables[0] if tables else None


def parse_page_slots(page) -> dict[str, str]:
    table = find_main_table(page)
    if not table:
        return {}
    slots: dict[str, str] = {}
    for row in table[1:]:
        hour = parse_hour_from_row(row)
        if hour is None:
            continue
        for day_index in range(5):
            col = day_index + 1
            if col >= len(row):
                continue
            teacher = extract_teacher(row[col])
            if teacher:
                slots[slot_key(day_index, hour)] = teacher
    return slots


def pdf_class_label(page_index: int, reader: pypdf.PdfReader) -> str:
    text = reader.pages[page_index].extract_text() or ""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return lines[6] if len(lines) > 6 else "?"


def merge_slots(base: dict[str, str], extra: dict[str, str]) -> dict[str, str]:
    out = dict(base)
    for key, value in extra.items():
        if value and (not out.get(key)):
            out[key] = value
    return out


def parse_pdf(pdf_path: Path) -> dict[str, dict[str, str]]:
    reader = pypdf.PdfReader(str(pdf_path))
    by_klas: dict[str, dict[str, str]] = {}
    labels: dict[str, list[str]] = {}

    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_num, klas in sorted(PAGE_TO_KLAS.items()):
            if page_num < 1 or page_num > len(pdf.pages):
                print(f"WARN: pagina {page_num} ontbreekt in PDF", file=sys.stderr)
                continue
            page = pdf.pages[page_num - 1]
            slots = parse_page_slots(page)
            label = pdf_class_label(page_num - 1, reader)
            labels.setdefault(klas, []).append(f"p{page_num}:{label}")
            by_klas[klas] = merge_slots(by_klas.get(klas, {}), slots)

    return by_klas, labels


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", nargs="?", default=str(DEFAULT_PDF))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--year", default=YEAR)
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.is_file():
        print(f"PDF niet gevonden: {pdf_path}", file=sys.stderr)
        return 1

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not args.dry_run and (not url or not key):
        print("Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY", file=sys.stderr)
        return 1

    by_klas, labels = parse_pdf(pdf_path)

    supabase = None if args.dry_run else create_client(url, key)

    if not args.dry_run:
        resp = supabase.table("students").select("klas").execute()
        app_klassen = sorted({row["klas"] for row in (resp.data or []) if row.get("klas")})
    else:
        app_klassen = sorted(set(PAGE_TO_KLAS.values()))

    missing_pdf = [k for k in app_klassen if k not in by_klas]
    if missing_pdf:
        print("Geen PDF-mapping voor:", ", ".join(missing_pdf))

    total_slots = 0
    for klas in sorted(by_klas):
        slots = by_klas[klas]
        filled = sum(1 for v in slots.values() if v)
        total_slots += filled
        src = ", ".join(labels.get(klas, []))
        print(f"{klas}: {filled} slots ({src})")

        if args.dry_run:
            continue

        row = {
            "id": timetable_id(args.year, klas),
            "year": args.year,
            "klas": klas,
            "slots": slots,
            "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        }
        result = supabase.table("timetables").upsert(row, on_conflict="year,klas").execute()
        if getattr(result, "error", None):
            print(f"  FOUT: {result.error}", file=sys.stderr)
            return 1

    print(f"\nKlaar: {len(by_klas)} klassen, {total_slots} ingevulde slots" + (" (dry-run)" if args.dry_run else " -> Supabase"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
