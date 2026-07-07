import { useAds } from "../../contexts/AdContext";
import { getPlacement } from "../../lib/ads/adConfig";
import { shouldInsertAd } from "../../lib/ads/infeed";
import AdSlot from "./AdSlot";

/* =========================================================
   インフィード広告（リストの途中に差し込む用）
   - リスト内 index の直後に置き、everyN 件ごとに1枠だけ描画する
   - 挿入条件を満たさない位置では何も描画しない（null）
   使い方: リストの各要素の直後に
     <InFeedAd placement="search_infeed" index={i} total={items.length} />
   ========================================================= */
export default function InFeedAd({ placement, index, total }) {
  const { config } = useAds();
  const place = getPlacement(config, placement);
  const everyN = place && place.everyNItems;

  if (!shouldInsertAd(index, total, everyN)) return null;

  return <AdSlot placement={placement} format="infeed" />;
}
