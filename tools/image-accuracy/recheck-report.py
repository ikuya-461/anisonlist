"""M5 の再検査結果（recheck/result-*.jsonl）を、オーナー確認用の HTML（recheck/report.html）にする。

使い方: python3 tools/image-accuracy/recheck-report.py
- 「そのまま」以外を分類ごとに並べ、今の画像と新しい判定の画像を左右に出す
- 各行の id で GO・見送りを指定してもらう
"""
import html
import json
from collections import Counter
from pathlib import Path

DIR = Path(__file__).parent / "recheck"

LABELS = {
    "replace": ("差し替え候補", "今の画像は新しい判定で落ちる（歌手違い・年違いなど）。右の画像に差し替える"),
    "delete": ("削除候補", "今の画像は新しい判定で落ち、正しい候補も無い。画像を消して NO IMAGE にする"),
    "unknown_new": ("確認できない（新しい候補あり）", "今の画像が検索結果に見つからない。右の画像に差し替えるか、今のままにするか"),
    "unknown_none": ("確認できない（新しい候補なし）", "今の画像が検索結果に見つからず、新しい判定でも付かない。今のままにするか、消すか"),
}


def esc(s):
    return html.escape(str(s or ""))


def describe(kind, item):
    if kind == "songs":
        work = item.get("anime_title") or item.get("game_title") or ""
        return f"{esc(item['song_title'])} / {esc(item['artist'])}<br><small>{esc(item['category'])}・{esc(work)}</small>"
    return f"{esc(item['title_jp'])}<br><small>{esc(item.get('title_en'))}・{esc(item.get('release_year'))} 年</small>"


def cand(kind, c):
    if not c:
        return "<small>—</small>"
    if kind == "songs":
        return f"<small>{esc(c['trackName'])} / {esc(c['artistName'])}<br>{esc(c['collectionName'])}</small>"
    return f"<small>{esc(c.get('native'))}<br>{esc(c.get('romaji'))}・{esc(c.get('year'))}・{esc(c.get('format'))}</small>"


def img(url):
    return f'<img src="{esc(url)}" loading="lazy" alt="">' if url else '<div class="noimg">NO IMAGE</div>'


sections = []
summary = []
for kind, name in [("songs", "曲"), ("anime", "アニメ作品")]:
    p = DIR / f"result-{kind}.jsonl"
    if not p.exists():
        continue
    rows = [json.loads(l) for l in p.read_text().splitlines() if l]
    counts = Counter(r["status"] for r in rows)
    summary.append(f"<li>{name} {len(rows)} 件：そのまま {counts['keep']}・"
                   + "・".join(f"{LABELS[s][0]} {counts[s]}" for s in LABELS) + "</li>")
    for status, (title, note) in LABELS.items():
        hits = [r for r in rows if r["status"] == status]
        if not hits:
            continue
        trs = []
        for r in hits:
            it = r["item"]
            after = (r.get("best") or {}).get("image") if status in ("replace", "unknown_new") else None
            trs.append(
                f"<tr><td class='id'>{kind}:{it['id']}</td><td>{describe(kind, it)}</td>"
                f"<td>{img(it['image_url'])}{cand(kind, r.get('current'))}</td>"
                f"<td>{img(after)}{cand(kind, r.get('best')) if after else ''}</td></tr>"
            )
        sections.append(
            f"<h2>{name}：{title}（{len(hits)} 件）</h2><p>{note}</p>"
            f"<table><thead><tr><th>id</th><th>DB の登録内容</th><th>今の画像</th><th>新しい画像</th></tr></thead>"
            f"<tbody>{''.join(trs)}</tbody></table>"
        )

page = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>画像の再検査</title>
<style>
:root {{ --bg:#fff; --fg:#1a1a1a; --muted:#666; --line:#ddd; --chip:#f3f3f3; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#141414; --fg:#eee; --muted:#aaa; --line:#333; --chip:#222; }} }}
body {{ background:var(--bg); color:var(--fg); font-family:system-ui,"Hiragino Sans",sans-serif; margin:0 auto; padding:16px; max-width:1100px; }}
p, small {{ color:var(--muted); }}
table {{ border-collapse:collapse; width:100%; margin-bottom:32px; }}
th, td {{ border-bottom:1px solid var(--line); padding:8px; text-align:left; vertical-align:top; }}
td.id {{ font-family:ui-monospace,monospace; white-space:nowrap; }}
img, .noimg {{ width:120px; height:120px; object-fit:cover; display:block; margin-bottom:4px; border-radius:4px; }}
.noimg {{ background:var(--chip); color:var(--muted); display:flex; align-items:center; justify-content:center; font-size:12px; }}
@media (max-width:640px) {{ img, .noimg {{ width:72px; height:72px; }} th, td {{ padding:4px; font-size:13px; }} }}
</style></head><body>
<h1>保存済み画像の再検査（M5）</h1>
<p>DB に保存済みの画像を新しい判定で見直した結果。DB はまだ変更していない。GO する id（または分類ごと）を指定してください。</p>
<ul>{''.join(summary)}</ul>
{''.join(sections)}
</body></html>"""
(DIR / "report.html").write_text(page)
print(DIR / "report.html")
