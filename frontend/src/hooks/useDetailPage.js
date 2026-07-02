import { useEffect, useState } from "react";

/**
 * 詳細ページ共通フック
 *
 * @param {(id: string) => Promise<any>} fetchFn  データ取得関数
 * @param {string} id  URL パラメータ
 * @returns {{ data: any, loading: boolean, setData: Function }}
 *
 * setData も返す。画像など重い付随データ(外部API)は fetchFn 内で待たず、
 * 呼び出し元コンポーネントが background で取得して setData((prev) => ...) で
 * 後からマージできるようにするため。
 */
export function useDetailPage(fetchFn, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await fetchFn(id);
        if (!cancelled) setData(result ?? null);
      } catch (err) {
        console.error("useDetailPage error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  // fetchFn は呼び出し元でコンポーネント外に定義するか useCallback で安定化すること
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { data, loading, setData };
}
