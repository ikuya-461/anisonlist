"""一括登録の試し実行（bulk/dryrun.jsonl）を集計し、オーナー確認用の HTML（bulk/dryrun-report.html）を作る。

使い方: python3 tools/image-accuracy/bulk-report.py [judgments.json]
- カテゴリごとの付く率と、正誤（README の基準。曲名・歌手が一致すれば自動で「正しい」）を出す
- 自動で決まらないものは bulk/dryrun-review.json に書き出す。目視の結果は {"<id>": "ok"|"ng"|"hold"} で渡す
"""
import html
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from analyze import norm, norm_title  # noqa: E402  測定と同じ正規化を使う

DIR = Path(__file__).parent / "bulk"
judgments = json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else {}

rows = [json.loads(l) for l in (DIR / "dryrun.jsonl").read_text().splitlines() if l]
stats = defaultdict(lambda: defaultdict(int))
review = []
cards = defaultdict(list)


def auto_judge(r):
    artist = norm(r["item"]["artist"]).split(",")[0].strip()
    ra = norm(r["hit"]["artistName"])
    same_title = norm_title(r["hit"]["trackName"]) == norm_title(r["item"]["song_title"])
    return "ok" if same_title and artist and ra and (artist in ra or ra in artist) else None


for r in rows:
    cat = r["item"]["category"]
    st = stats[cat]
    st["total"] += 1
    st["queries"] += r["queriesUsed"]
    if not r["image"]:
        continue
    st["adopted"] += 1
    j = judgments.get(str(r["id"])) or auto_judge(r)
    if j is None:
        st["unjudged"] += 1
        review.append(r)
    else:
        st[j] += 1
    cards[cat].append((r, j))

(DIR / "dryrun-review.json").write_text(json.dumps(review, ensure_ascii=False, indent=1))

print("| カテゴリ | 曲数 | 付いた | 付く率 | 正しい | 誤り | 保留 | 未判定 | 誤り率 | 1 曲あたり検索 |")
print("|---|---|---|---|---|---|---|---|---|---|")
for cat, st in stats.items():
    judged = st["ok"] + st["ng"]
    print(f"| {cat} | {st['total']} | {st['adopted']} | {st['adopted'] / st['total']:.1%} | {st['ok']} | {st['ng']} "
          f"| {st['hold']} | {st['unjudged']} | {(st['ng'] / judged if judged else 0):.1%} | {st['queries'] / st['total']:.2f} |")
print(f"\n目視が必要: {len(review)} 件 → bulk/dryrun-review.json")

esc = lambda s: html.escape(str(s or ""))
LABEL = {"ok": "正しい", "ng": "誤り", "hold": "保留", None: "未判定"}
sections = []
for cat, items in cards.items():
    st = stats[cat]
    figs = "".join(
        f"<figure class='{j or 'none'}'><img src='{esc(r['image'])}' loading='lazy' alt=''>"
        f"<figcaption><b>{esc(r['item']['song_title'])}</b> / {esc(r['item']['artist'])}"
        f"<br><small>iTunes：{esc(r['hit']['trackName'])} / {esc(r['hit']['artistName'])}<br>"
        f"{esc(r['hit']['collectionName'])}<br>id {r['id']}・{LABEL[j]}</small></figcaption></figure>"
        for r, j in items
    )
    sections.append(f"<h2>{esc(cat)}：{st['adopted']} / {st['total']} 曲に付いた</h2><div class='grid'>{figs}</div>")

page = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>一括登録の試し実行</title>
<style>
:root {{ --bg:#fff; --fg:#1a1a1a; --muted:#666; --line:#ddd; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#141414; --fg:#eee; --muted:#aaa; --line:#333; }} }}
body {{ background:var(--bg); color:var(--fg); font-family:system-ui,"Hiragino Sans",sans-serif; margin:0 auto; padding:16px; max-width:1200px; }}
small, p {{ color:var(--muted); }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; margin-bottom:32px; }}
figure {{ margin:0; border:1px solid var(--line); border-radius:6px; padding:6px; font-size:13px; }}
figure.ng {{ border-color:#d93025; }} figure.hold, figure.none {{ border-color:#f9ab00; }}
img {{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:4px; display:block; }}
</style></head><body>
<h1>曲画像の一括登録：試し実行</h1>
<p>DB は変えていない。付いた画像だけを並べている（枠が赤＝誤り、黄＝保留・未判定）。</p>
{''.join(sections)}
</body></html>"""
(DIR / "dryrun-report.html").write_text(page)
print(DIR / "dryrun-report.html")
