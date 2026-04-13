from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEXT_ROOT = ROOT / "generated" / "question_bank_text" / "audit"
OUTPUT_ROOT = ROOT / "generated" / "structured_question_bank" / "audit"
PUBLIC_OUTPUT = ROOT / "public" / "data" / "audit-question-bank.json"


SECTION_NAMES = {
    "单项选择题": "single",
    "多项选择题": "multiple",
    "简答题": "analysis",
    "计算分析题": "analysis",
    "综合题": "case",
    "问答题": "case",
}

SECTION_ORDER = {
    "single": 1,
    "multiple": 2,
    "analysis": 3,
    "case": 4,
}

OPTION_PATTERN = re.compile(r"^([A-D])[\.\．、](.*)$")
QUESTION_START_PATTERN = re.compile(r"^(\d+)[\.\．、](.*)$")
ANSWER_LINE_PATTERN = re.compile(r"^(\d+)[\.\．、]?\s*(.*)$")
MAJOR_QUESTION_PATTERN = re.compile(r"^第([一二三四五六七八九十两〇零百]+)题$")


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


CHINESE_NUMBER_MAP = {
    "零": 0,
    "〇": 0,
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
    "百": 100,
}


def clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("（ ", "（").replace(" ）", "）")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def body_only(text: str) -> str:
    marker = "## 正文"
    return text.split(marker, 1)[1].strip() if marker in text else text.strip()


def normalize_section_title(text: str) -> str | None:
    compact = re.sub(r"\s+", "", text)
    for title in SECTION_NAMES:
        if title in compact:
            return title
    return None


def get_section_title_by_type(section_type: str) -> str:
    for title, mapped_type in SECTION_NAMES.items():
        if mapped_type == section_type:
            return title
    return ""


def chinese_to_int(text: str) -> int:
    text = text.strip()
    if not text:
        return 0
    if text.isdigit():
        return int(text)
    if text == "十":
        return 10
    if "十" in text:
        left, _, right = text.partition("十")
        tens = CHINESE_NUMBER_MAP.get(left, 1) if left else 1
        ones = CHINESE_NUMBER_MAP.get(right, 0) if right else 0
        return tens * 10 + ones
    total = 0
    unit = 1
    for char in reversed(text):
        value = CHINESE_NUMBER_MAP.get(char, 0)
        if value >= 10:
            unit = value
            if total == 0:
                total = unit
        else:
            total += value * unit
    return total


def append_question_content(question: QuestionRecord | None, line: str, current_option_key: str | None) -> None:
    if not question:
        return
    if current_option_key and question.options:
        question.options[current_option_key] = (question.options[current_option_key] + " " + line).strip()
    else:
        question.stem = (question.stem + " " + line).strip()


def parse_questions(question_text: str, year: int, source_name: str) -> list[QuestionRecord]:
    lines = [line.strip() for line in clean_text(body_only(question_text)).splitlines()]
    records: list[QuestionRecord] = []
    current_section_name = ""
    current_section_type = ""
    current_question: QuestionRecord | None = None
    current_option_key: str | None = None
    pending_question: tuple[int, str] | None = None
    section_question_count = 0

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        line = re.sub(r"^[lI][\.\．。、]", "1.", line)
        if "答案解析" in line or line.startswith("专业网校") or line.startswith("慧考智学官网"):
            continue

        section_title = normalize_section_title(line)
        if section_title:
            current_section_name = section_title
            current_section_type = SECTION_NAMES[section_title]
            section_question_count = 0
            if pending_question:
                current_question = QuestionRecord(
                    year=year,
                    section_name=current_section_name,
                    section_type=current_section_type,
                    number=pending_question[0],
                    stem=pending_question[1],
                    source={"question_text": source_name},
                )
                records.append(current_question)
                section_question_count = 1
                pending_question = None
            else:
                current_question = None
            current_option_key = None
            continue

        if current_section_type in {"analysis", "case"}:
            major_question_match = MAJOR_QUESTION_PATTERN.match(line)
            if major_question_match:
                current_question = QuestionRecord(
                    year=year,
                    section_name=current_section_name,
                    section_type=current_section_type,
                    number=chinese_to_int(major_question_match.group(1)),
                    stem="",
                    source={"question_text": source_name},
                )
                records.append(current_question)
                section_question_count += 1
                current_option_key = None
                continue

            numbered_major_match = QUESTION_START_PATTERN.match(line)
            if numbered_major_match:
                current_question = QuestionRecord(
                    year=year,
                    section_name=current_section_name,
                    section_type=current_section_type,
                    number=int(numbered_major_match.group(1)),
                    stem=numbered_major_match.group(2).strip(),
                    source={"question_text": source_name},
                )
                records.append(current_question)
                section_question_count += 1
                current_option_key = None
                continue

            append_question_content(current_question, line, current_option_key)
            continue

        question_match = QUESTION_START_PATTERN.match(line)
        if question_match:
            if current_section_name:
                question_number = int(question_match.group(1))
                if question_number == 1 and section_question_count >= 8:
                    if current_section_type == "single":
                        current_section_type = "multiple"
                        current_section_name = get_section_title_by_type("multiple") or current_section_name
                    elif current_section_type == "multiple":
                        current_section_type = "analysis"
                        current_section_name = get_section_title_by_type("analysis") or current_section_name

                current_question = QuestionRecord(
                    year=year,
                    section_name=current_section_name,
                    section_type=current_section_type,
                    number=question_number,
                    stem=question_match.group(2).strip(),
                    source={"question_text": source_name},
                )
                records.append(current_question)
                section_question_count += 1
                current_option_key = None
                continue

            if int(question_match.group(1)) == 1 and not records and not pending_question:
                pending_question = (1, question_match.group(2).strip())
                current_option_key = None
                continue

        option_match = OPTION_PATTERN.match(line)
        if option_match and current_question:
            current_option_key = option_match.group(1)
            current_question.options[current_option_key] = option_match.group(2).strip()
            continue

        append_question_content(current_question, line, current_option_key)

    return records


def extract_inline_answer(text: str) -> str:
    direct_answer_match = re.search(
        r"(?:【答案】|\[答案\]|【参考答案】|【正确答案】|答案[：:]|参考答案[：:]|正确答案[：:])\s*([A-D]+)",
        text,
    )
    if direct_answer_match:
        return direct_answer_match.group(1)

    compact = re.sub(r"\s+", "", text)
    prefix_match = re.match(r"^([A-D]+)(?=【|\[|解析|$)", compact)
    if prefix_match:
        return prefix_match.group(1)

    # OCR may corrupt the "答案" marker while preserving terminal option letters.
    tail_match = re.search(r"([A-D]{1,4})$", compact)
    if tail_match and len(compact) <= 24:
        return tail_match.group(1)

    return ""


def parse_answers(answer_text: str) -> dict[str, dict[int, dict[str, str]]]:
    lines = [line.strip() for line in clean_text(body_only(answer_text)).splitlines()]
    data: dict[str, dict[int, dict[str, str]]] = {}
    current_section_name = "单项选择题"
    current_answer_section_name = current_section_name
    data.setdefault(current_section_name, {})
    current_number: int | None = None
    last_number_in_section = 0
    index = 0
    pending_answer: tuple[str, int] | None = None

    def append_analysis(section_name: str, number: int | None, content: str) -> None:
        if number is None or not content:
            return
        bucket = data.setdefault(section_name, {}).setdefault(number, {})
        bucket["analysis"] = (bucket.get("analysis", "") + " " + content).strip()

    while index < len(lines):
        line = lines[index]
        if not line:
            index += 1
            continue
        line = re.sub(r"^[lI][\.\．。、]", "1.", line)
        if line.startswith("专业网校") or line.startswith("慧考智学官网") or line.startswith("考察知识点"):
            index += 1
            continue

        if pending_answer:
            compact_line = re.sub(r"\s+", "", line)
            if re.fullmatch(r"[A-D]+", compact_line):
                pending_section_name, pending_number = pending_answer
                bucket = data.setdefault(pending_section_name, {}).setdefault(pending_number, {})
                bucket["answer"] = compact_line
                current_answer_section_name = pending_section_name
                current_number = pending_number
                pending_answer = None
                index += 1
                continue

        section_title = normalize_section_title(line)
        if section_title:
            current_section_name = section_title
            data.setdefault(current_section_name, {})
            current_number = None
            last_number_in_section = 0
            index += 1
            continue

        if current_section_name in {"简答题", "计算分析题", "综合题"}:
            major_question_match = MAJOR_QUESTION_PATTERN.match(line)
            if major_question_match:
                current_number = chinese_to_int(major_question_match.group(1))
                current_answer_section_name = current_section_name
                data[current_section_name].setdefault(current_number, {})
                index += 1
                continue

            if current_number is not None:
                append_analysis(current_answer_section_name, current_number, line)
            index += 1
            continue

        match = ANSWER_LINE_PATTERN.match(line)
        if match and current_section_name:
            number = int(match.group(1))
            rest = match.group(2).strip()
            answer_section_name = current_section_name
            direct_answer = extract_inline_answer(rest)

            if current_section_name == "多项选择题" and number >= 20:
                answer_section_name = "单项选择题"
            elif (
                current_section_name == "多项选择题"
                and not any(bucket.get("answer") for bucket in data.get("多项选择题", {}).values())
                and number > 20
            ):
                answer_section_name = "单项选择题"

            if not direct_answer and any(
                token in rest for token in ["【答案】", "[答案]", "【参考答案】", "【正确答案】", "答案：", "答案:"]
            ):
                look_ahead = index + 1
                while look_ahead < len(lines):
                    candidate = lines[look_ahead].strip()
                    if not candidate:
                        look_ahead += 1
                        continue
                    if normalize_section_title(candidate) or QUESTION_START_PATTERN.match(candidate):
                        break
                    compact_candidate = re.sub(r"\s+", "", candidate)
                    if re.fullmatch(r"[A-D]+", compact_candidate):
                        direct_answer = compact_candidate
                        index = look_ahead
                    break

            if direct_answer:
                current_answer_section_name = answer_section_name
                current_number = number
                last_number_in_section = number
                bucket = data[answer_section_name].setdefault(number, {})
                bucket["answer"] = direct_answer

                direct_analysis = ""
                for marker in ["【慧考解析】", "【答案解析】", "【解析】", "【斯尔解析】"]:
                    if marker in rest:
                        direct_analysis = rest.split(marker, 1)[1].strip()
                        break
                if direct_analysis:
                    bucket["analysis"] = direct_analysis
                index += 1
                continue

            if any(
                token in rest for token in ["【答案】", "[答案]", "【参考答案】", "【正确答案】", "答案：", "答案:"]
            ):
                pending_answer = (answer_section_name, number)
                current_answer_section_name = answer_section_name
                current_number = number
                data.setdefault(answer_section_name, {}).setdefault(number, {})
                index += 1
                continue

        if "参考答案：" in line or "参考答案:" in line:
            if current_answer_section_name and current_number is not None:
                answer = re.split(r"参考答案[：:]", line, maxsplit=1)[1].strip()
                data[current_answer_section_name].setdefault(current_number, {})["answer"] = answer
            index += 1
            continue

        if "【慧考解析】" in line:
            append_analysis(current_answer_section_name, current_number, line.split("【慧考解析】", 1)[1].strip())
            index += 1
            continue

        if "【答案解析】" in line or "【解析】" in line or "【斯尔解析】" in line:
            for marker in ["【答案解析】", "【解析】", "【斯尔解析】"]:
                if marker in line:
                    append_analysis(current_answer_section_name, current_number, line.split(marker, 1)[1].strip())
                    break
            index += 1
            continue

        if not match or not current_section_name:
            if current_number is not None:
                append_analysis(current_answer_section_name, current_number, line)
            index += 1
            continue
        append_analysis(current_answer_section_name, current_number, line)
        index += 1

    return data


def merge_combined_text(combined_text: str, year: int, source_name: str) -> list[QuestionRecord]:
    lines = [line.strip() for line in clean_text(body_only(combined_text)).splitlines()]
    records: list[QuestionRecord] = []
    current_section_name = ""
    current_section_type = ""
    current_question: QuestionRecord | None = None
    current_option_key: str | None = None
    in_analysis = False

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("专业网校课程") or line.startswith("慧考智学官网") or line.isdigit():
            continue

        section_title = normalize_section_title(line)
        if section_title:
            current_section_name = section_title
            current_section_type = SECTION_NAMES[section_title]
            current_question = None
            current_option_key = None
            in_analysis = False
            continue

        question_match = QUESTION_START_PATTERN.match(line)
        if question_match and current_section_name:
            current_question = QuestionRecord(
                year=year,
                section_name=current_section_name,
                section_type=current_section_type,
                number=int(question_match.group(1)),
                stem=question_match.group(2).strip(),
                source={"combined_text": source_name},
            )
            records.append(current_question)
            current_option_key = None
            in_analysis = False
            continue

        if not current_question:
            continue

        if line.startswith("参考答案：") or line.startswith("参考答案:"):
            answer = line.split("：", 1)[1].strip() if "：" in line else line.split(":", 1)[1].strip()
            current_question.answer = "" if answer == "详见解析" else answer
            in_analysis = False
            continue

        if "【慧考解析】" in line:
            analysis = line.split("【慧考解析】", 1)[1].strip()
            current_question.analysis = (current_question.analysis + " " + analysis).strip()
            in_analysis = True
            continue

        option_match = OPTION_PATTERN.match(line)
        if option_match and current_section_type in {"single", "multiple"} and not in_analysis:
            current_option_key = option_match.group(1)
            current_question.options[current_option_key] = option_match.group(2).strip()
            continue

        if in_analysis:
            current_question.analysis = (current_question.analysis + " " + line).strip()
            continue

        append_question_content(current_question, line, current_option_key)

    return records


def parse_2025_answer_blocks(answer_text: str) -> dict[str, dict[int, dict[str, str]]]:
    section_titles = ["一、单项选择题", "二、多项选择题", "三、简答题"]
    section_name_map = {
        "一、单项选择题": "单项选择题",
        "二、多项选择题": "多项选择题",
        "三、简答题": "简答题",
    }
    answer_map: dict[str, dict[int, dict[str, str]]] = {}

    current_section = ""
    current_number: int | None = None
    current_bucket: dict[str, str] | None = None

    for raw_line in answer_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line in section_titles:
            current_section = section_name_map[line]
            answer_map.setdefault(current_section, {})
            current_number = None
            current_bucket = None
            continue
        if (
            line.isdigit()
            or line.startswith("注册会计师真题回忆版")
            or line.startswith("2025 年度注册会计师全国统一考试")
            or line.startswith("《真题回忆版》审计")
            or line.startswith("推荐关注")
            or line.startswith("查咨询")
            or line.startswith("之了课堂")
            or line.startswith("【公众号】")
            or line.startswith("【视频号】")
            or line.startswith("【小红书】")
            or line.startswith("【抖音】")
        ):
            continue

        answer_match = re.match(r"^(\d+)\.\s*【答案】\s*(.*)$", line)
        if answer_match and current_section:
            current_number = int(answer_match.group(1))
            answer_text_value = answer_match.group(2).strip()
            answer_value = re.match(r"^([A-D]{1,4})$", answer_text_value)
            current_bucket = {
                "answer": answer_value.group(1) if answer_value else "",
                "analysis": "",
            }
            answer_map[current_section][current_number] = current_bucket
            continue

        if line.startswith("【解析】") and current_bucket is not None:
            current_bucket["analysis"] = (current_bucket.get("analysis", "") + " " + line[4:].strip()).strip()
            continue

        if current_bucket is not None:
            current_bucket["analysis"] = (current_bucket.get("analysis", "") + " " + line).strip()

    return answer_map


def parse_2025_question_blocks(question_text: str, year: int, source_name: str) -> list[QuestionRecord]:
    section_titles = ["一、单项选择题", "二、多项选择题", "三、简答题"]
    section_map = {
        "一、单项选择题": ("单项选择题", "single"),
        "二、多项选择题": ("多项选择题", "multiple"),
        "三、简答题": ("简答题", "analysis"),
    }

    records: list[QuestionRecord] = []
    current_section_name = ""
    current_section_type = ""
    current_question: QuestionRecord | None = None
    current_option_key: str | None = None

    def create_question(number: int, stem: str) -> QuestionRecord:
        return QuestionRecord(
            year=year,
            section_name=current_section_name,
            section_type=current_section_type,
            number=number,
            stem=stem.strip(),
            source={"combined_text": source_name},
        )

    for raw_line in question_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        line = line.replace("\u0007", "").replace("", "")
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue

        if line in section_titles:
            current_section_name, current_section_type = section_map[line]
            current_question = None
            current_option_key = None
            continue

        if (
            line.isdigit()
            or line.startswith("注册会计师真题回忆版")
            or line.startswith("2025 年度注册会计师全国统一考试")
            or line.startswith("《真题回忆版》审计")
            or line.startswith("扫码关注")
            or line.startswith("获取：")
        ):
            continue
        if not current_section_type:
            continue

        option_match = re.match(r"^([A-D])[\.\、．]\s*(.*)$", line)
        if option_match and current_question and current_section_type in {"single", "multiple"}:
            current_option_key = option_match.group(1)
            current_question.options[current_option_key] = option_match.group(2).strip()
            continue

        question_match = re.match(r"^(\d+)[\.\、．]\s*(.*)$", line)
        if question_match:
            question_number = int(question_match.group(1))
            question = create_question(question_number, question_match.group(2))
            records.append(question)
            current_question = question
            current_option_key = None
            continue

        # OCR fallback for lost numeric prefix in objective section.
        if (
            current_section_type in {"single", "multiple"}
            and current_question
            and len(current_question.options) >= 4
            and line.endswith("）。")
            and len(line) >= 12
            and not re.match(r"^[（(]\d+[）)]", line)
        ):
            question = create_question(current_question.number + 1, line)
            records.append(question)
            current_question = question
            current_option_key = None
            continue

        append_question_content(current_question, line, current_option_key)

    return records


def parse_audit_2025_combined(combined_text: str, year: int, source_name: str) -> list[QuestionRecord]:
    body = clean_text(body_only(combined_text))
    starts = [match.start() for match in re.finditer("一、单项选择题", body)]
    if len(starts) < 2:
        return [clean_question_record(item) for item in merge_combined_text(combined_text, year, source_name)]

    question_part = body[starts[0] : starts[1]]
    answer_part = body[starts[1] :]

    questions = parse_2025_question_blocks(question_part, year, source_name)
    answer_map = parse_2025_answer_blocks(answer_part)

    for question in questions:
        bucket = answer_map.get(question.section_name, {}).get(question.number, {})
        question.answer = bucket.get("answer", "")
        question.analysis = bucket.get("analysis", "")

    return [clean_question_record(item) for item in questions]


def split_stem_and_options(content: str) -> tuple[str, dict[str, str]]:
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    stem_parts: list[str] = []
    options: dict[str, str] = {}
    current_option_key: str | None = None

    for line in lines:
        option_match = OPTION_PATTERN.match(line)
        if option_match:
            current_option_key = option_match.group(1)
            options[current_option_key] = option_match.group(2).strip()
            continue

        if current_option_key:
            options[current_option_key] = (options[current_option_key] + " " + line).strip()
        else:
            stem_parts.append(line)

    return " ".join(stem_parts).strip(), options


def looks_like_major_subjective_prompt(question: QuestionRecord) -> bool:
    stem = question.stem.strip()
    if re.search(r"[（(](?:\d{4}|2×\d{2})", stem):
        return True
    if "相关年度发生的有关交易或事项如下" in stem:
        return True
    if "发生的有关交易或事项如下" in stem:
        return True
    if "以下简称" in stem:
        return True
    return False


def collapse_subjective_subquestions(records: list[QuestionRecord]) -> list[QuestionRecord]:
    collapsed: list[QuestionRecord] = []

    for question in records:
        if question.section_type not in {"analysis", "case"}:
            collapsed.append(question)
            continue

        if not collapsed or collapsed[-1].section_type != question.section_type:
            collapsed.append(question)
            continue

        previous = collapsed[-1]
        if previous.number != question.number:
            collapsed.append(question)
            continue

        previous.stem = (previous.stem + "\n" + question.stem).strip()
        if question.analysis:
            previous.analysis = (previous.analysis + "\n" + question.analysis).strip()

    return collapsed


def clean_stem_text(stem: str) -> str:
    cleaned = stem.strip()
    cleaned = re.sub(r"\d{4}年度注会《会计》试题", "", cleaned)
    cleaned = re.sub(r"本题型共.*?答案[。\.]?", "", cleaned)
    cleaned = re.sub(r"备选答案中选出.*?答案[。\.]?", "", cleaned)
    cleaned = re.sub(r"\(\)", "( )", cleaned)
    cleaned = re.sub(r"（\s*）", "( )", cleaned)
    cleaned = re.sub(r"\(\s*\)\s*\)\s*。", "( )。", cleaned)
    cleaned = re.sub(r"\(\s+\)", "( )", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def normalize_ocr_text(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"[\x00-\x1f]+", " ", cleaned)
    cleaned = re.sub(r"\(\)", "( )", cleaned)
    cleaned = re.sub(r"（\s*）", "( )", cleaned)
    cleaned = re.sub(r"(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])", "", cleaned)
    cleaned = re.sub(r"(?<=[A-D0-9])\s+(?=[A-D0-9])", "", cleaned)
    cleaned = re.sub(r"\s*([，。；：、？！])\s*", r"\1", cleaned)
    cleaned = re.sub(r"(?<=\d)\s+(?=[年月日元股万%])", "", cleaned)
    cleaned = re.sub(r"(?<=[\(（])\s+", "", cleaned)
    cleaned = re.sub(r"\s+(?=[\)）])", "", cleaned)
    cleaned = re.sub(r"\s*([,./\-+×÷=])\s*", r"\1", cleaned)
    cleaned = re.sub(r"(?<=\d)\s+(?=\.)", "", cleaned)
    cleaned = re.sub(r"(?<=\.)\s+(?=\d)", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.replace("()", "( )")
    cleaned = re.sub(r"（\s*）", "( )", cleaned)
    return cleaned.strip()


def rebuild_objective_options(options: dict[str, str]) -> dict[str, str]:
    if not options:
        return options

    blob = " ".join(f"{key}.{value}" for key, value in options.items()).strip()
    matches = list(re.finditer(r"([A-D])[\.\．、]", blob))
    if len(matches) < 2:
        return {key: normalize_ocr_text(value) for key, value in options.items()}

    rebuilt: dict[str, str] = {}
    for index, match in enumerate(matches):
        key = match.group(1)
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(blob)
        content = normalize_ocr_text(blob[start:end])
        rebuilt[key] = content

    if len(rebuilt) >= len(options):
        return {key: rebuilt[key] for key in sorted(rebuilt)}

    normalized = {key: normalize_ocr_text(value) for key, value in options.items()}
    return {key: normalized[key] for key in sorted(normalized)}


def trim_single_analysis_tail(question: QuestionRecord) -> str:
    analysis = question.analysis.strip()
    if not analysis or not question.answer:
        return analysis

    answer = question.answer.strip()
    if len(answer) != 1 or answer not in {"A", "B", "C", "D"}:
        return analysis

    marker_match = re.search(rf"选项\s*{answer}\s*正确[。\.]", analysis)
    if marker_match and marker_match.end() < len(analysis):
        trailing = analysis[marker_match.end():].strip()
        if trailing and ("会计分录如下" in trailing or re.search(r"选项\s*[A-D]\s*正确", trailing)):
            return analysis[: marker_match.end()].strip()

    return analysis


def clean_question_record(question: QuestionRecord) -> QuestionRecord:
    question.stem = normalize_ocr_text(clean_stem_text(question.stem))
    question.options = rebuild_objective_options(question.options)
    question.answer = normalize_ocr_text(question.answer)
    question.analysis = normalize_ocr_text(question.analysis)
    question.analysis = re.sub(r"^(答案解析|参考答案解析)\s*", "", question.analysis)

    if question.section_type == "single":
        question.analysis = trim_single_analysis_tail(question)

    apply_audit_overrides(question)
    return question


def apply_audit_overrides(question: QuestionRecord) -> None:
    if question.year == 2023 and question.section_type == "single":
        if question.number == 1:
            question.stem = "下列各项中，不属于审计的前提条件的是( )。"
        elif question.number == 3:
            question.stem = "注册会计师在确定编制财务报表时采取的财务报告编制基础的可接受性时，下列各项考虑因素中，通常无须考虑的是( )。"
            question.options = {
                "A": "被审计单位的性质",
                "B": "财务报表的性质",
                "C": "财务报表的目的",
                "D": "被审计单位管理层的责任",
            }
        elif question.number == 6:
            question.stem = "下列各项中，不属于审计的固有限制的是( )。"
            question.options = {
                "A": "注册会计师获取审计证据的能力受到实务和法律上的限制",
                "B": "注册会计师无法将审计风险降低为零",
                "C": "实施的审计程序可能发现不了串通舞弊",
                "D": "财务报表项目涉及主观决策、评估或一定程度的不确定性",
            }

    if question.year == 2022:
        question.analysis = question.analysis.removeprefix("答案解析").strip()

    if question.year == 2017 and question.section_type == "multiple" and question.number == 5 and len(question.options) < 4:
        question.options = {
            "A": "被审计单位新聘任的财务总监缺乏必要的胜任能力",
            "B": "被审计单位管理层缺乏诚信",
            "C": "被审计单位某项销售交易涉及复杂的安排",
            "D": "被审计单位长期资产减值准备存在高度的估计不确定性",
        }

    if question.year == 2018 and question.section_type == "single" and question.number == 22 and len(question.options) < 4:
        question.options["D"] = "书面声明的日期可以早于审计报告日"

    if not question.answer:
        objective_answer_overrides: dict[tuple[int, str, int], str] = {
            (2017, "multiple", 10): "AB",
            (2018, "multiple", 10): "ACD",
            (2019, "multiple", 10): "ABCD",
            (2021, "multiple", 15): "ABCD",
        }
        question.answer = objective_answer_overrides.get((question.year, question.section_type, question.number), question.answer)


def build_year_bank(year: int) -> list[QuestionRecord]:
    combined_file = next(TEXT_ROOT.glob(f"{year}_*_题目和答案.txt"), None)
    if combined_file:
        if year == 2025:
            return parse_audit_2025_combined(
                combined_file.read_text(encoding="utf-8"),
                year,
                combined_file.name,
            )
        return [clean_question_record(item) for item in merge_combined_text(combined_file.read_text(encoding="utf-8"), year, combined_file.name)]

    question_file = next(TEXT_ROOT.glob(f"{year}_*_题目.txt"), None)
    answer_file = next(TEXT_ROOT.glob(f"{year}_*_答案.txt"), None)
    if not question_file:
        return []

    questions = parse_questions(question_file.read_text(encoding="utf-8"), year, question_file.name)
    answer_map = parse_answers(answer_file.read_text(encoding="utf-8")) if answer_file else {}

    for question in questions:
        answer_bucket = answer_map.get(question.section_name, {}).get(question.number, {})
        question.answer = answer_bucket.get("answer", question.answer)
        question.analysis = answer_bucket.get("analysis", question.analysis)
        if answer_file:
            question.source["answer_text"] = answer_file.name

    return [clean_question_record(item) for item in collapse_subjective_subquestions(questions)]


def to_practice_item(question: QuestionRecord) -> dict[str, object]:
    ordered_options = [{"key": key, "text": value} for key, value in sorted(question.options.items())]
    return {
        "id": f"audit-{question.year}-{question.section_type}-{question.number}",
        "year": question.year,
        "subject": "审计",
        "type": question.section_type,
        "sectionOrder": SECTION_ORDER[question.section_type],
        "sectionName": question.section_name,
        "number": question.number,
        "title": f"{question.year}年审计{question.section_name}第{question.number}题",
        "stem": question.stem,
        "options": ordered_options,
        "answer": question.answer,
        "analysis": question.analysis,
    }


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    all_questions: list[QuestionRecord] = []
    year_summary: list[dict[str, object]] = []

    for year in range(2013, 2026):
        year_bank = build_year_bank(year)

        if year == 2025 and year_bank:
            objective_items = [item for item in year_bank if item.section_type in {"single", "multiple"}]
            if objective_items:
                missing_answers = sum(1 for item in objective_items if not item.answer)
                broken_options = sum(1 for item in objective_items if len(item.options) < 4)
                if (missing_answers / len(objective_items)) > 0.6 or (broken_options / len(objective_items)) > 0.3:
                    year_bank = []

        all_questions.extend(year_bank)

        year_payload = [asdict(item) for item in year_bank]
        (OUTPUT_ROOT / f"{year}.json").write_text(
            json.dumps(year_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        year_summary.append(
            {
                "year": year,
                "count": len(year_bank),
                "single_count": sum(1 for item in year_bank if item.section_type == "single"),
                "multiple_count": sum(1 for item in year_bank if item.section_type == "multiple"),
                "analysis_count_total": sum(1 for item in year_bank if item.section_type == "analysis"),
                "case_count": sum(1 for item in year_bank if item.section_type == "case"),
                "answered_count": sum(1 for item in year_bank if item.answer),
                "analysis_count": sum(1 for item in year_bank if item.analysis),
            }
        )

    practice_payload = {
        "subject": "审计",
        "years": year_summary,
        "questions": [to_practice_item(item) for item in all_questions],
    }
    PUBLIC_OUTPUT.write_text(json.dumps(practice_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    summary = {
        "subject": "审计",
        "total_questions": len(all_questions),
        "years": year_summary,
        "practice_output": str(PUBLIC_OUTPUT.relative_to(ROOT)).replace("\\", "/"),
    }
    (OUTPUT_ROOT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
