"""測定結果（results/<label>-<kind>.jsonl）を集計する。

使い方: python3 tools/image-accuracy/analyze.py <label> [judgments.json]
- 付く率をカテゴリ別に出す
- 採用した画像を README の基準で自動判定し、自動で決められないものを review-<label>.json に書き出す
- judgments.json（{"<kind>:<id>": "ok"|"ng"|"hold"}）を渡すと、目視判定を合わせて誤り率を出す
"""
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

DIR = Path(__file__).parent


def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s or "")).strip().lower()


def norm_title(s):
    s = norm(s)
    s = re.sub(r"[(\[{（【「].*?[)\]}）】」]", "", s)
    s = re.sub(r"\s*[-–—]\s.*$", "", s)
    s = re.sub(r"(?:feat|ft)\.?.*$", "", s)
    s = re.sub(r"[!！?？。、,.\-_/~〜・:：'\"’”]", "", s)
    return re.sub(r"\s+", "", s)


def auto_judge(kind, rec):
    a = rec["adopted"]
    it = rec["item"]
    if kind == "songs":
        artist = norm(it["artist"]).split(",")[0].strip()
        ra = norm(a["artistName"])
        same_title = norm_title(a["trackName"]) == norm_title(it["song_title"])
        same_artist = bool(artist and ra and (artist in ra or ra in artist))
        return "ok" if same_title and same_artist else None
    # 題名が完全一致でも、リメイク等で年が違う別作品がある。年が 2 年以上ずれたら目視に回す
    y1, y2 = it.get("release_year"), a.get("seasonYear")
    year_ok = y1 is None or y2 is None or abs(y1 - y2) <= 1
    return "ok" if norm(a.get("native")) == norm(it["title_jp"]) and year_ok else None


def main():
    label = sys.argv[1] if len(sys.argv) > 1 else "current"
    judgments = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else {}

    review = []
    stats = defaultdict(lambda: defaultdict(int))
    for kind in ["songs", "anime"]:
        p = DIR / "results" / f"{label}-{kind}.jsonl"
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            rec = json.loads(line)
            it = rec["item"]
            cat = it.get("category", "anime_work") if kind == "songs" else "anime_work"
            st = stats[cat]
            st["total"] += 1
            if rec.get("error"):
                st["error"] += 1
                continue
            if not rec.get("adopted"):
                st["none"] += 1
                continue
            st["adopted"] += 1
            key = f"{kind}:{rec['id']}"
            j = judgments.get(key) or auto_judge(kind, rec)
            if j is None:
                st["unjudged"] += 1
                review.append({"key": key, "category": cat, "item": it, "adopted": rec["adopted"]})
            else:
                st[j] += 1

    (DIR / f"review-{label}.json").write_text(json.dumps(review, ensure_ascii=False, indent=1))

    print(f"| カテゴリ | 抽出 | 付いた | 付く率 | 正しい | 誤り | 保留 | 未判定 | 誤り率 | APIエラー |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for cat, st in stats.items():
        adopted = st["adopted"]
        judged = st["ok"] + st["ng"]
        print(
            f"| {cat} | {st['total']} | {adopted} | {adopted / st['total']:.1%} | {st['ok']} | {st['ng']} | {st['hold']} "
            f"| {st['unjudged']} | {(st['ng'] / judged if judged else 0):.1%} | {st['error']} |"
        )
    print(f"\n目視が必要: {len(review)} 件 → review-{label}.json")


if __name__ == "__main__":
    main()
