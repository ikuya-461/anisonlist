/* =========================================================
   インフィード広告の挿入判定（純関数・テスト対象の芯）
   - リスト内の index の直後に広告を差し込むべきか
   - everyN 件ごと。ただし末尾の直後には出さない
     （リスト最後がいきなり広告で終わるのを防ぐ）
   ========================================================= */
export function shouldInsertAd(index, total, everyN) {
  if (!everyN || everyN < 1) return false;
  if (index === total - 1) return false; // 末尾直後には出さない
  return (index + 1) % everyN === 0;
}
