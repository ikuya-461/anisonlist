import styles from "./Skeleton.module.css";

/* =========================================================
   汎用スケルトン
   - width / height / radius を渡してブロック単体で使う
   - variant で用途別の複合スケルトンを使い分ける
   ========================================================= */
export default function Skeleton({
  width = "100%",
  height = 16,
  radius = 4,
  className = "",
  style = {}
}) {
  return (
    <span
      className={`${styles.block} ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/* -------------------------------------------------------
   曲リスト行（ListPageSongCard / SongList 用）
------------------------------------------------------- */
export function SongRowSkeleton() {
  return (
    <div className={styles.songRow} aria-hidden="true">
      <Skeleton width={52} height={52} radius={4} />
      <div className={styles.songRowText}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={11} />
      </div>
    </div>
  );
}

export function SongListSkeleton({ count = 6 }) {
  return (
    <div className={styles.list} role="status" aria-label="読み込み中">
      {Array.from({ length: count }).map((_, i) => (
        <SongRowSkeleton key={i} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------
   メディアカード（アニメ／ゲーム／アーティストのグリッド用）
------------------------------------------------------- */
export function MediaCardSkeleton() {
  return (
    <div className={styles.mediaCard} aria-hidden="true">
      <Skeleton width="100%" height={0} radius={6} className={styles.mediaThumb} />
      <Skeleton width="80%" height={13} />
      <Skeleton width="55%" height={11} />
    </div>
  );
}

export function MediaGridSkeleton({ count = 6 }) {
  return (
    <div className={styles.grid} role="status" aria-label="読み込み中">
      {Array.from({ length: count }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------
   詳細ページ（曲／アニメ／ゲーム／アーティスト）
------------------------------------------------------- */
export function DetailSkeleton() {
  return (
    <div className={styles.detail} role="status" aria-label="読み込み中">
      <div className={styles.detailHead}>
        <Skeleton width={140} height={140} radius={8} />
        <div className={styles.detailHeadText}>
          <Skeleton width="70%" height={24} />
          <Skeleton width="45%" height={14} />
          <Skeleton width="55%" height={14} />
        </div>
      </div>
      <SongListSkeleton count={5} />
    </div>
  );
}
