from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEXT_ROOT = ROOT / "generated" / "question_bank_text" / "tax"
OUTPUT_ROOT = ROOT / "generated" / "structured_question_bank" / "tax"
PUBLIC_OUTPUT = ROOT / "public" / "data" / "tax-question-bank.json"

SECTION_NAMES = {
    "单项选择题": "single",
    "多项选择题": "multiple",
    "计算问答题": "analysis",
    "计算分析题": "analysis",
    "简答题": "analysis",
    "综合题": "case",
    "问答题": "case",
    # mojibake variants kept for compatibility with old extracted texts
    "鍗曢」閫夋嫨棰?": "single",
    "澶氶」閫夋嫨棰?": "multiple",
    "璁＄畻闂瓟棰?": "analysis",
    "璁＄畻鍒嗘瀽棰?": "analysis",
    "绠€绛旈": "analysis",
    "缁煎悎棰?": "case",
}

SECTION_ORDER = {"single": 1, "multiple": 2, "analysis": 3, "case": 4}
QUESTION_START_PATTERN = re.compile(r"^\s*(\d{1,2})[\.．、:：]?\s*(.*)$")
OPTION_PATTERN = re.compile(r"^\s*([A-D])[\.．、:：]?\s*(.*)$")
ANSWER_EXPLICIT_PATTERN = re.compile(r"(?:参考答案|答案|正确答案)[：:\]\】\s]*([A-D]{1,4})")
MAJOR_SUBJECTIVE_PATTERN = re.compile(r"^第?([一二三四五六七八九十百零\d]+)题")

CHN_NUM = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}


@dataclass
class QuestionRecord:
    year: int
    section_name: str
    section_type: str
    number: int
    stem: str = ""
    options: dict[str, str] = field(default_factory=dict)
    answer: str = ""
    analysis: str = ""
    source: dict[str, str] = field(default_factory=dict)


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def body_only(text: str) -> str:
    return text.split("## 姝ｆ枃", 1)[1].strip() if "## 姝ｆ枃" in text else text.strip()


def normalize_section_title(line: str) -> str | None:
    compact = re.sub(r"\s+", "", line)
    for title in SECTION_NAMES:
        if title in compact:
            return title
    return None


def chinese_to_int(raw: str) -> int:
    s = raw.strip()
    if s.isdigit():
        return int(s)
    if s == "十":
        return 10
    if "十" in s:
        left, _, right = s.partition("十")
        tens = CHN_NUM.get(left, 1) if left else 1
        ones = CHN_NUM.get(right, 0) if right else 0
        return tens * 10 + ones
    return CHN_NUM.get(s, 0)


def extract_answer(text: str) -> str:
    m = ANSWER_EXPLICIT_PATTERN.search(text)
    if m:
        return m.group(1)
    compact = re.sub(r"\s+", "", text)
    m2 = re.match(r"^[A-D]{1,4}(?=$|【|\[|解析)", compact)
    if m2:
        return m2.group(0)
    return ""


def parse_questions(question_text: str, year: int, source_name: str) -> list[QuestionRecord]:
    lines = [line.strip() for line in normalize_text(body_only(question_text)).splitlines()]
    records: list[QuestionRecord] = []
    current_section_name = "单项选择题"
    current_section_type = "single"
    current_question: QuestionRecord | None = None
    current_option: str | None = None

    for line in lines:
        if not line:
            continue
        if line.startswith("专业网校") or line.startswith("www.") or line.isdigit():
            continue

        section = normalize_section_title(line)
        if section:
            current_section_name = section
            current_section_type = SECTION_NAMES[section]
            current_question = None
            current_option = None
            continue

        m_major = MAJOR_SUBJECTIVE_PATTERN.match(line)
        if current_section_type in {"analysis", "case"} and m_major:
            current_question = QuestionRecord(
                year=year,
                section_name=current_section_name,
                section_type=current_section_type,
                number=chinese_to_int(m_major.group(1)),
                source={"question_text": source_name},
            )
            records.append(current_question)
            current_option = None
            continue

        m_q = QUESTION_START_PATTERN.match(line)
        if m_q:
            number = int(m_q.group(1))
            current_question = QuestionRecord(
                year=year,
                section_name=current_section_name,
                section_type=current_section_type,
                number=number,
                stem=m_q.group(2).strip(),
                source={"question_text": source_name},
            )
            records.append(current_question)
            current_option = None
            continue

        if current_question is None:
            continue

        m_opt = OPTION_PATTERN.match(line)
        if current_section_type in {"single", "multiple"} and m_opt:
            current_option = m_opt.group(1)
            current_question.options[current_option] = m_opt.group(2).strip()
            continue

        if current_option and current_section_type in {"single", "multiple"} and current_question.options:
            current_question.options[current_option] = (current_question.options[current_option] + " " + line).strip()
        else:
            current_question.stem = (current_question.stem + " " + line).strip()

    return records


def parse_answers(answer_text: str) -> dict[str, dict[int, dict[str, str]]]:
    lines = [line.strip() for line in normalize_text(body_only(answer_text)).splitlines()]
    answer_map: dict[str, dict[int, dict[str, str]]] = {}
    current_section = "单项选择题"
    current_number: int | None = None

    for line in lines:
        if not line:
            continue
        if line.startswith("专业网校") or line.startswith("www.") or line.isdigit():
            continue

        section = normalize_section_title(line)
        if section:
            current_section = section
            current_number = None
            continue

        m_q = QUESTION_START_PATTERN.match(line)
        if m_q:
            current_number = int(m_q.group(1))
            rest = m_q.group(2).strip()
            bucket = answer_map.setdefault(current_section, {}).setdefault(current_number, {})
            ans = extract_answer(rest)
            if ans:
                bucket["answer"] = ans
            for marker in ("【解析】", "【答案解析】", "解析：", "解析:"):
                if marker in rest:
                    bucket["analysis"] = rest.split(marker, 1)[1].strip()
                    break
            continue

        if current_number is None:
            continue

        bucket = answer_map.setdefault(current_section, {}).setdefault(current_number, {})
        ans2 = extract_answer(line)
        if ans2 and "answer" not in bucket:
            bucket["answer"] = ans2
            continue
        if any(k in line for k in ("【解析】", "【答案解析】", "解析：", "解析:")):
            for marker in ("【解析】", "【答案解析】", "解析：", "解析:"):
                if marker in line:
                    content = line.split(marker, 1)[1].strip()
                    bucket["analysis"] = (bucket.get("analysis", "") + " " + content).strip()
                    break
            continue
        bucket["analysis"] = (bucket.get("analysis", "") + " " + line).strip()

    return answer_map


def normalize_numbers(records: list[QuestionRecord]) -> None:
    counters: dict[str, int] = {}
    for q in records:
        counters[q.section_type] = counters.get(q.section_type, 0) + 1
        q.number = counters[q.section_type]


def build_year_bank(year: int) -> list[QuestionRecord]:
    combined_file = next(TEXT_ROOT.glob(f"{year}_*_题目和答案.txt"), None)
    if combined_file:
        records = parse_questions(combined_file.read_text(encoding="utf-8"), year, combined_file.name)
        answer_map = parse_answers(combined_file.read_text(encoding="utf-8"))
    else:
        question_file = next(TEXT_ROOT.glob(f"{year}_*_题目.txt"), None)
        answer_file = next(TEXT_ROOT.glob(f"{year}_*_答案.txt"), None)
        if not question_file:
            return []
        records = parse_questions(question_file.read_text(encoding="utf-8"), year, question_file.name)
        answer_map = parse_answers(answer_file.read_text(encoding="utf-8")) if answer_file else {}

    for q in records:
        bucket = answer_map.get(q.section_name, {}).get(q.number, {})
        if not bucket:
            # fallback by section type
            for sec_name, sec_type in SECTION_NAMES.items():
                if sec_type == q.section_type:
                    bucket = answer_map.get(sec_name, {}).get(q.number, {})
                    if bucket:
                        break
        q.answer = bucket.get("answer", q.answer)
        q.analysis = bucket.get("analysis", q.analysis)
        q.stem = re.sub(r"\s+", " ", q.stem).strip()
        q.answer = re.sub(r"\s+", "", q.answer).strip()
        q.analysis = re.sub(r"\s+", " ", q.analysis).strip()

    normalize_numbers(records)
    return records


def to_practice_item(q: QuestionRecord) -> dict[str, object]:
    fingerprint = hashlib.md5(q.stem.encode("utf-8")).hexdigest()[:8]
    return {
        "id": f"tax-{q.year}-{q.section_type}-{q.number}-{fingerprint}",
        "year": q.year,
        "subject": "税法",
        "type": q.section_type,
        "sectionOrder": SECTION_ORDER[q.section_type],
        "sectionName": q.section_name,
        "number": q.number,
        "title": f"{q.year}年税法{q.section_name}第{q.number}题",
        "stem": q.stem,
        "options": [{"key": k, "text": v} for k, v in sorted(q.options.items())],
        "answer": q.answer,
        "analysis": q.analysis,
    }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    all_records: list[QuestionRecord] = []
    year_summary: list[dict[str, object]] = []

    for year in range(2013, 2026):
        year_records = build_year_bank(year)
        all_records.extend(year_records)

        (OUTPUT_ROOT / f"{year}.json").write_text(
            json.dumps([asdict(x) for x in year_records], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        year_summary.append(
            {
                "year": year,
                "count": len(year_records),
                "single_count": sum(1 for x in year_records if x.section_type == "single"),
                "multiple_count": sum(1 for x in year_records if x.section_type == "multiple"),
                "analysis_count_total": sum(1 for x in year_records if x.section_type == "analysis"),
                "case_count": sum(1 for x in year_records if x.section_type == "case"),
                "answered_count": sum(1 for x in year_records if x.answer),
                "analysis_count": sum(1 for x in year_records if x.analysis),
            }
        )

    payload = {"subject": "税法", "years": year_summary, "questions": [to_practice_item(x) for x in all_records]}
    PUBLIC_OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    summary = {
        "subject": "税法",
        "total_questions": len(all_records),
        "years": year_summary,
        "practice_output": str(PUBLIC_OUTPUT.relative_to(ROOT)).replace("\\", "/"),
    }
    (OUTPUT_ROOT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

