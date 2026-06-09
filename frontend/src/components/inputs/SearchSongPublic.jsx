import SearchSong from "./SearchSong";

/**
 * 公開用の検索コンポーネント（ログイン不要）
 * SearchSong の薄いラッパー。onAdd は渡さない（リストへの追加機能なし）
 */
export default function SearchSongPublic() {
  return <SearchSong heading="アニソン検索（公開）" />;
}
