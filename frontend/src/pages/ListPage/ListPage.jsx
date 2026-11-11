import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { getListDetail } from "../../lib/queries/lists";
import {
  getListSongs,
  addSongToList,
  removeSongFromList,
  reorderListSongs
} from "../../lib/queries/listSongs";
import {
  getListAnime,
  addAnimeToList,
  removeAnimeFromList,
  reorderListAnime
} from "../../lib/queries/listAnime";
import { ensureSongImages } from "../../lib/imageCache/songImageCache";
import { songDisplayImage } from "../../lib/imageCache/songDisplayImage";
import { ensureAnimeImages } from "../../lib/imageCache/animeImageCache";

import ListHeader from "../../components/list/ListHeader";
import ListSelect from "../../components/list/ListSelect";
import SearchSong from "../../components/search/SearchSong";
import SongList from "../../components/list/SongList";
import AnimeList from "../../components/list/AnimeList";
import AddSongModal from "../../components/modals/AddSongModal";
import AddAnimeModal from "../../components/modals/AddAnimeModal";
import RankingImageModal from "../../components/modals/RankingImageModal";
import { SongListSkeleton } from "../../components/ui/Skeleton";
import { useLanguage } from "../../contexts/LanguageContext";

import styles from "./ListPage.module.css";

export default function ListPage() {
  const { id } = useParams();
  const listId = id;

  const [songs, setSongs] = useState([]);
  const [animeItems, setAnimeItems] = useState([]);
  const [listInfo, setListInfo] = useState(null);
  const [pendingSong, setPendingSong] = useState(null); // 曲追加モーダル用
  const [pendingAnime, setPendingAnime] = useState(null); // アニメ追加モーダル用
  const [itemsLoading, setItemsLoading] = useState(true); // 初回ロード用
  const [showRanking, setShowRanking] = useState(false); // シェア画像モーダル

  const navigate = useNavigate();
  const { t } = useLanguage();

  const isAnimeList = listInfo?.list_type === "anime";

  // リスト情報を再取得する（リスト名変更後にも再利用）
  const fetchListInfo = useCallback(async () => {
    const data = await getListDetail(listId);
    if (data) setListInfo(data);
  }, [listId]);

  // list_songs を取得して整形する（曲追加・削除後にも再利用）
  const fetchListSongs = useCallback(async () => {
    const data = await getListSongs(listId);
    setItemsLoading(false);
    setSongs(data.map((row) => ({
      id: row.id,
      song_id: row.song_id,
      title: row.song_title,
      artist: row.artist,
      anime_title: row.anime_title,
      type: row.song_type,
      image_url: row.image_url,
      anime_image_url: row.anime_image_url,
      position: row.position,
      memo: row.memo,
      emotion_tags: row.emotion_tags,
      encounter_type: row.encounter_type,
    })));
  }, [listId]);

  // list_anime を取得（アニメリスト用）
  const fetchListAnime = useCallback(async () => {
    const data = await getListAnime(listId);
    setItemsLoading(false);
    setAnimeItems(data);
  }, [listId]);

  useEffect(() => {
    setItemsLoading(true);
    fetchListInfo();
  }, [listId, fetchListInfo]);

  // リストタイプが確定してから中身を取得（曲/アニメで参照先が違う）
  useEffect(() => {
    if (!listInfo) return;
    if (listInfo.list_type === "anime") fetchListAnime();
    else fetchListSongs();
  }, [listInfo, fetchListAnime, fetchListSongs]);

  // 画像が未キャッシュの曲/アニメをバックグラウンドで補完する
  // （リスト表示はブロックしない。listId+タイプが変わるたびに1回だけ実行）
  const fetchedImagesForRef = useRef(null);
  useEffect(() => {
    if (itemsLoading || !listInfo) return;
    const key = `${listId}:${listInfo.list_type}`;
    if (fetchedImagesForRef.current === key) return;
    fetchedImagesForRef.current = key;
    let cancelled = false;

    if (isAnimeList) {
      if (!animeItems.some((a) => !a.image_url)) return;
      const toFetch = animeItems.map((a) => ({
        id: a.anime_id,
        title_jp: a.title_jp,
        title_en: a.title_en,
        title_romaji: a.title_romaji,
        release_year: a.release_year,
        image_url: a.image_url,
      }));
      ensureAnimeImages(toFetch).then((withImages) => {
        if (cancelled) return;
        setAnimeItems((prev) =>
          prev.map((a) => {
            const found = withImages.find((w) => w.id === a.anime_id);
            return found
              ? {
                  ...a,
                  image_url: found.image_url ?? a.image_url,
                  title_en: found.title_en ?? a.title_en,
                  title_romaji: found.title_romaji ?? a.title_romaji,
                }
              : a;
          })
        );
      });
    } else {
      if (!songs.some((s) => !s.image_url)) return;
      const toFetch = songs.map((s) => ({
        song_id: s.song_id,
        song_title: s.title,
        artist: s.artist,
        image_url: s.image_url,
      }));
      ensureSongImages(toFetch).then((withImages) => {
        if (cancelled) return;
        setSongs((prev) =>
          prev.map((s) => {
            const found = withImages.find((w) => w.song_id === s.song_id);
            return found && found.image_url ? { ...s, image_url: found.image_url } : s;
          })
        );
      });
    }

    return () => { cancelled = true; };
  }, [listId, listInfo, itemsLoading, isAnimeList, songs, animeItems]);

  /* -------------------------------------------------------
     ★ 曲追加（SearchSong の ＋ボタン → モーダルを開く）
  ------------------------------------------------------- */
  const handleAddSong = (song) => {
    setPendingSong(song);
  };

  // モーダルで「保存する」
  const handleModalSave = async ({ memo, emotion_tags, encounter_type }) => {
    await addSongToList(listId, pendingSong.song_id, { memo, emotion_tags, encounter_type });
    setPendingSong(null);
    fetchListSongs();
  };

  // モーダルで「スキップ」
  const handleModalSkip = async () => {
    await addSongToList(listId, pendingSong.song_id);
    setPendingSong(null);
    fetchListSongs();
  };

  /* -------------------------------------------------------
     ★ アニメ追加（アニメ検索のカードクリック → モーダル）
  ------------------------------------------------------- */
  const handleAddAnime = (anime) => {
    setPendingAnime(anime);
  };

  const handleAnimeModalSave = async ({ memo, anime_tags }) => {
    await addAnimeToList(listId, pendingAnime.id, { memo, anime_tags });
    setPendingAnime(null);
    fetchListAnime();
  };

  const handleAnimeModalSkip = async () => {
    await addAnimeToList(listId, pendingAnime.id);
    setPendingAnime(null);
    fetchListAnime();
  };

  /* -------------------------------------------------------
     ★ 削除
  ------------------------------------------------------- */
  const handleDeleteSong = async (listSongId) => {
    await removeSongFromList(listSongId);
    fetchListSongs();
  };

  const handleDeleteAnime = async (listAnimeId) => {
    await removeAnimeFromList(listAnimeId);
    fetchListAnime();
  };

  /* -------------------------------------------------------
     ★ 並び替え後の state 更新
  ------------------------------------------------------- */
  const handleChangeOrder = async (newSongs) => {
    setSongs(newSongs);

    await reorderListSongs(
      listId,
      newSongs.map((s) => ({ id: s.id, position: s.position }))
    );
  };

  const handleChangeAnimeOrder = async (newItems) => {
    setAnimeItems(newItems);

    await reorderListAnime(
      listId,
      newItems.map((s) => ({ id: s.id, position: s.position }))
    );
  };

  // 共有画像も、曲の画像が無ければ作品の表紙を代わりに使う
  const shareItems = isAnimeList ? animeItems : songs.map((s) => ({ ...s, image_url: songDisplayImage(s) }));

  return (
    <div className={styles.outer}>
      {pendingSong && (
        <AddSongModal
          song={pendingSong}
          onSave={handleModalSave}
          onSkip={handleModalSkip}
        />
      )}
      {pendingAnime && (
        <AddAnimeModal
          anime={pendingAnime}
          onSave={handleAnimeModalSave}
          onSkip={handleAnimeModalSkip}
        />
      )}
      {showRanking && (
        <RankingImageModal
          listName={listInfo?.name}
          songs={shareItems}
          itemType={isAnimeList ? "anime" : "song"}
          publicUrl={listInfo?.is_public ? `${window.location.origin}/public/${listId}` : null}
          onClose={() => setShowRanking(false)}
        />
      )}
      <div className={styles.inner}>
        <ListHeader
          listId={listId}
          listInfo={listInfo}
          onUpdated={fetchListInfo}
        />

        <ListSelect
          selectedList={listId}
          onSelectList={(newId) => {
            window.location.href = `/list/${newId}`;
          }}
        />

        {!itemsLoading && shareItems.length > 0 && (
          <button className={styles.rankingBtn} onClick={() => setShowRanking(true)}>
            {t("ranking.open")}
          </button>
        )}

        {itemsLoading ? (
          <SongListSkeleton count={6} />
        ) : isAnimeList ? (
          <AnimeList
            items={animeItems}
            onChangeOrder={handleChangeAnimeOrder}
            onDeleted={handleDeleteAnime}
            onClickAnime={(animeId) => navigate(`/anime/${animeId}`)}
          />
        ) : (
          <SongList
            songs={songs}
            sortable={true}
            onChangeOrder={handleChangeOrder}
            onDeleted={handleDeleteSong}
            onAdd={handleAddSong}
            onClickSong={(songId) => navigate(`/songs/${songId}`)}
          />
        )}

        {/* リストタイプ確定後に描画（曲検索が一瞬出るのを防ぐ） */}
        {listInfo && (
          isAnimeList
            ? <SearchSong onAddAnime={handleAddAnime} />
            : <SearchSong onAdd={handleAddSong} />
        )}
      </div>
    </div>
  );
}
