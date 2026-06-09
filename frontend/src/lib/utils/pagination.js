import { PAGE_SIZE } from "../constants";

/**
 * ページ番号から Supabase の range() に渡す from/to を計算する
 * @param {number} page 1始まりのページ番号
 * @returns {{ from: number, to: number }}
 */
export function calcRange(page) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  return { from, to };
}

/**
 * 総件数から総ページ数を計算する（最小 1 ページ）
 * @param {number|null} count 総件数
 * @returns {number}
 */
export function calcTotalPages(count) {
  return Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
}
