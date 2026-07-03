import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { getListDetail } from "../../lib/queries/lists";
import {
  getListSongs,
  addSongToList,
  removeSongFromList,
  reorderListSongs
} from "../../lib/queries/listSongs";

import ListHeader from "../../components/list/ListHeader";
import ListSelect from "../../components/list/ListSelect";
import SearchSong from "../../components/search/SearchSong";
import SongList from "../../components/list/SongList";
import AddSongModal from "../../components/modals/AddSongModal";
import RankingImageModal from "../../components/modals/RankingImageModal";
import { SongListSkeleton } from "../../components/ui/Skeleton";
import { useLanguage } from "../../contexts/LanguageContext";

import styles from "./ListPage.module.css";

export default function ListPage() {
  const { id } = useParams();
  const listId = id;

  const [songs, setSongs] = useState([]);
  const [listInfo, setListInfo] = useState(null);
  const [pendingSong, setPendingSong] = useState(null); // モーダル用
  const [songsLoading, setSongsLoading] = useState(true); // 初回ロード用
  const [showRanking, setShowRanking] = useState(false); // ランキング画像モーダル

  const navigate = useNavigate();
  const { t } = useLanguage();

  // リスト情報を再取得する（リスト名変更後にも再利用）
  const fetchListInfo = useCallback(async () => {
    const data = await getListDetail(listId);
    if (data) setListInfo(data);
  }, [listId]);

  // list_songs を取得して整形する（曲追加・削除後にも再利用）
  // useCallback で安定化させることで useEffect の deps に安全に追加できる
  const fetchListSongs = useCallback(async () => {
    const data = await getListSongs(listId);
    setSongsLoading(false);
    setSongs(data.map((row) => ({
      id: row.id,
      song_id: row.song_id,
      title: row.song_title,
      artist: row.artist,
      anime_title: row.anime_title,
      type: row.song_type,
      image_url: row.image_url,
      position: row.position,
      memo: row.memo,
      emotion_tags: row.emotion_tags,
      encounter_type: row.encounter_type,
    })));
  }, [listId]);

  useEffect(() => {
    fetchListInfo();
    fetchListSongs();
  }, [listId, fetchListInfo, fetchListSongs]);

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
     ★ 曲削除
  ------------------------------------------------------- */
  const handleDeleteSong = async (listSongId) => {
    await removeSongFromList(listSongId);
    fetchListSongs();
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

  return (
    <div className={styles.outer}>
      {pendingSong && (
        <AddSongModal
          song={pendingSong}
          onSave={handleModalSave}
          onSkip={handleModalSkip}
        />
      )}
      {showRanking && (
        <RankingImageModal
          listName={listInfo?.name}
          songs={songs}
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

        {!songsLoading && songs.length > 0 && (
          <button className={styles.rankingBtn} onClick={() => setShowRanking(true)}>
            {t("ranking.open")}
          </button>
        )}

        {songsLoading ? (
          <SongListSkeleton count={6} />
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

        <SearchSong onAdd={handleAddSong} />
      </div>
    </div>
  );
}
