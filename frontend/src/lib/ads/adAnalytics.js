/* =========================================================
   広告の計測（表示回数=impression / クリック=click）
   - 今はシンクをコンソール(dev)と window フックに送るだけ
   - GA / Supabase テーブル等へは setAdSink() でシンクを差し替える
   - CTR は impression と click から下流で集計する前提
   ========================================================= */
let sink = null;

// 外部シンクを差し込む（例: GA, Supabase）。未設定なら開発ログのみ
export function setAdSink(fn) {
  sink = typeof fn === "function" ? fn : null;
}

function dispatch(event) {
  const payload = { ...event, ts: Date.now() };

  if (sink) {
    try { sink(payload); } catch { /* シンク側の失敗は握りつぶす（広告計測でUXを止めない） */ }
  } else if (process.env.NODE_ENV !== "production") {
    // 開発時のみ確認用に出力
    // eslint-disable-next-line no-console
    console.debug("[ad]", payload);
  }

  // 任意の外部計測フック（テスト・デバッグ用）
  if (typeof window !== "undefined" && typeof window.__adTrack === "function") {
    try { window.__adTrack(payload); } catch { /* noop */ }
  }
}

export function trackImpression(placement, meta = {}) {
  dispatch({ kind: "impression", placement, ...meta });
}

export function trackClick(placement, meta = {}) {
  dispatch({ kind: "click", placement, ...meta });
}
