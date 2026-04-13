from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF_ROOT = ROOT / "public" / "pdf"
OUTPUT_ROOT = ROOT / "generated" / "question_bank_text"


@dataclass
class PdfEntry:
    subject_dir: str
    year: int
    paper_type: str
    source_path: Path
    output_path: Path
    char_count: int
    page_count: int


def normalize_text(text: str) -> str:
    text = text.replace("\u3000", " ")
    text = text.replace("\xa0", " ")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def detect_paper_type(filename: str) -> str:
    if "题目和答案" in filename:
      return "题目和答案"
    if "题目" in filename:
      return "题目"
    if "答案" in filename:
      return "答案"
    return "未知"


def extract_pdf_text(path: Path) -> tuple[str, int]:
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return normalize_text("\n\n".join(pages)), len(reader.pages)


def build_output_name(pdf_path: Path) -> str:
    stem = pdf_path.stem
    return f"{stem}.txt"


def write_text_output(entry: PdfEntry, text: str) -> None:
    entry.output_path.parent.mkdir(parents=True, exist_ok=True)
    header = [
        f"# {entry.source_path.stem}",
        "",
        f"- 科目目录: {entry.subject_dir}",
        f"- 年份: {entry.year}",
        f"- 类型: {entry.paper_type}",
        f"- 原始文件: {entry.source_path.as_posix()}",
        "",
        "## 正文",
        "",
    ]
    entry.output_path.write_text("\n".join(header) + text + "\n", encoding="utf-8")


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    catalog: list[dict[str, object]] = []

    for pdf_path in sorted(PDF_ROOT.rglob("*.pdf")):
        relative = pdf_path.relative_to(PDF_ROOT)
        subject_dir = relative.parts[0] if len(relative.parts) > 1 else "unknown"
        year_match = re.match(r"(\d{4})_", pdf_path.name)
        year = int(year_match.group(1)) if year_match else 0
        paper_type = detect_paper_type(pdf_path.name)
        output_path = OUTPUT_ROOT / subject_dir / build_output_name(pdf_path)

        text, page_count = extract_pdf_text(pdf_path)

        entry = PdfEntry(
            subject_dir=subject_dir,
            year=year,
            paper_type=paper_type,
            source_path=pdf_path,
            output_path=output_path,
            char_count=len(text),
            page_count=page_count,
        )
        write_text_output(entry, text)

        catalog.append(
            {
                "subject_dir": entry.subject_dir,
                "year": entry.year,
                "paper_type": entry.paper_type,
                "source_pdf": str(entry.source_path.relative_to(ROOT)).replace("\\", "/"),
                "output_text": str(entry.output_path.relative_to(ROOT)).replace("\\", "/"),
                "page_count": entry.page_count,
                "char_count": entry.char_count,
            }
        )

    (OUTPUT_ROOT / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    summary_lines = [
        "# 题库文本生成结果",
        "",
        f"- PDF 根目录: {PDF_ROOT.as_posix()}",
        f"- 文本输出目录: {OUTPUT_ROOT.as_posix()}",
        f"- 共处理 PDF: {len(catalog)} 份",
        "",
        "## 科目统计",
        "",
    ]

    subject_counts: dict[str, int] = {}
    for item in catalog:
        subject_counts[item["subject_dir"]] = subject_counts.get(item["subject_dir"], 0) + 1

    for subject_dir, count in sorted(subject_counts.items()):
        summary_lines.append(f"- {subject_dir}: {count} 份")

    (OUTPUT_ROOT / "README.md").write_text("\n".join(summary_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
