from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[1] / "public" / "data"
BANK_FILES = sorted(DATA_DIR.glob("*-question-bank.json"))


def is_objective(q: dict[str, Any]) -> bool:
    return q.get("type") in {"single", "multiple"}


def stem_text(q: dict[str, Any]) -> str:
    return str(q.get("stem") or "").strip()


def option_count(q: dict[str, Any]) -> int:
    options = q.get("options")
    return len(options) if isinstance(options, list) else 0


def looks_fragment(stem: str) -> bool:
    if not stem:
        return True
    if stem[0] in "，。；、)%）,.:":
        return True
    if re.match(r"^[0-9０-９]+[%％]?[，,。.]", stem):
        return True
    if len(stem) <= 12:
        return True
    return False


def combine_text(a: str, b: str) -> str:
    a = (a or "").strip()
    b = (b or "").strip()
    if not a:
        return b
    if not b:
        return a
    if a.endswith(("。", "？", "！")):
        return f"{a}{b}"
    return f"{a}{b}"


def merge_fragment_into(base: dict[str, Any], frag: dict[str, Any]) -> None:
    base["stem"] = combine_text(str(base.get("stem") or ""), str(frag.get("stem") or ""))
    if option_count(base) < 2 and option_count(frag) >= 2:
        base["options"] = frag.get("options", [])
    if not str(base.get("answer") or "").strip() and str(frag.get("answer") or "").strip():
        base["answer"] = frag.get("answer")
    if str(frag.get("analysis") or "").strip():
        base["analysis"] = combine_text(str(base.get("analysis") or ""), str(frag.get("analysis") or ""))


def recompute_year_meta(questions: list[dict[str, Any]], years: list[dict[str, Any]]) -> None:
    by_year: dict[int, list[dict[str, Any]]] = {}
    for q in questions:
        by_year.setdefault(int(q["year"]), []).append(q)

    for ym in years:
        y = int(ym["year"])
        arr = by_year.get(y, [])
        ym["count"] = len(arr)
        ym["single_count"] = sum(1 for q in arr if q.get("type") == "single")
        ym["multiple_count"] = sum(1 for q in arr if q.get("type") == "multiple")
        ym["case_count"] = sum(1 for q in arr if q.get("type") == "case")
        ym["answered_count"] = sum(
            1
            for q in arr
            if str(q.get("answer") or "").strip() not in {"", "暂无", "N/A"}
        )
        ym["analysis_count"] = sum(
            1
            for q in arr
            if str(q.get("analysis") or "").strip() not in {"", "暂无", "N/A"}
        )


def renumber_and_reid(questions: list[dict[str, Any]], slug: str) -> None:
    order_keys: dict[tuple[int, str], int] = {}
    for q in questions:
        key = (int(q["year"]), str(q["type"]))
        order_keys[key] = order_keys.get(key, 0) + 1
        number = order_keys[key]
        q["number"] = number
        q["id"] = f"{slug}-{int(q['year'])}-{q['type']}-{number}"
        title = str(q.get("title") or "")
        if title:
            q["title"] = re.sub(r"第\s*\d+\s*题", f"第{number}题", title)


def repair_file(path: Path) -> tuple[int, int]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    questions: list[dict[str, Any]] = raw.get("questions", [])
    original_count = len(questions)

    remove_indexes: set[int] = set()

    # Pass 1: merge obvious split fragments with neighbor in same year/type
    for i, q in enumerate(questions):
        if i in remove_indexes:
            continue
        y, t = int(q["year"]), str(q["type"])
        s = stem_text(q)
        opts = option_count(q)

        # Objective question split: current stem present but options missing, next carries options/continuation
        if is_objective(q) and opts < 2 and i + 1 < len(questions):
            nxt = questions[i + 1]
            if int(nxt["year"]) == y and str(nxt["type"]) == t:
                ns = stem_text(nxt)
                nn = int(nxt.get("number") or 0)
                cn = int(q.get("number") or 0)
                if option_count(nxt) >= 2 or looks_fragment(ns) or nn - cn > 20:
                    merge_fragment_into(q, nxt)
                    remove_indexes.add(i + 1)
                    continue

        # Objective orphan fragment: empty stem, merge into previous same year/type if possible
        if is_objective(q) and not s and i - 1 >= 0:
            prv = questions[i - 1]
            if int(prv["year"]) == y and str(prv["type"]) == t:
                merge_fragment_into(prv, q)
                remove_indexes.add(i)
                continue

        # Subjective fragment with abnormal number (e.g. 38/75): append to previous same year/type
        if t in {"analysis", "case"} and (int(q.get("number") or 0) > 30 or looks_fragment(s)):
            if i - 1 >= 0:
                prv = questions[i - 1]
                if int(prv["year"]) == y and str(prv["type"]) == t:
                    merge_fragment_into(prv, q)
                    remove_indexes.add(i)
                    continue

    if remove_indexes:
        questions = [q for i, q in enumerate(questions) if i not in remove_indexes]

    # Pass 2: remove unrecoverable objective broken records
    cleaned: list[dict[str, Any]] = []
    for q in questions:
        if is_objective(q):
            if option_count(q) < 2:
                continue
            if not stem_text(q):
                continue
        cleaned.append(q)
    questions = cleaned

    slug = path.name.replace("-question-bank.json", "")
    renumber_and_reid(questions, slug)
    recompute_year_meta(questions, raw.get("years", []))
    raw["questions"] = questions
    path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    return original_count, len(questions)


def main() -> None:
    for file_path in BANK_FILES:
        before, after = repair_file(file_path)
        print(f"{file_path.name}: {before} -> {after}")


if __name__ == "__main__":
    main()

