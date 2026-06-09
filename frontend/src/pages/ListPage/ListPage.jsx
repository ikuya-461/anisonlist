import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { getListDetail } from "../../lib/queries/lists";
import {
  getListSongs,
  addSongToList,
  removeSongFromList,
  reorderListSongs
} from "../../lib/queries/listSongs";

import ListHeader from "../../components/parts/ListHeader";
import ListSelect from "../../components/parts/ListSelect";
import SearchSong from "../../components/inputs/SearchSong";
import SongList from "../../components/listItem/SongList";

import styles from "../../CSS/PageCSS/ListPage.module.css";

export default function ListPage() {
  const { id } = useParams();
  const listId = id;

  const [songs, setSongs] = useState([]);
  const [listInfo, setListInfo] = useState(null);

  const navigate = useNavigate();

  // リスト情報を再取得する（リスト名変更後にも再利用）
  const fetchListInfo = useCallback(async () => {
    const data = await getListDetail(listId);
    if (data) setListInfo(data);
  }, [listId]);

  // list_songs を取得して整形する（曲追加・削除後にも再利用）
  // useCallback で安定化させることで useEffect の deps に安全に追加できる
  const fetchListSongs = useCallback(async () => {
    const data = await getListSongs(listId);
    setSongs(data.map((row) => ({
      id: row.id,
      song_id: row.song_id,
      title: row.song_title,
      artist: row.artist,
      anime_title: row.anime_title,
      type: row.song_type,
      image_url: row.image_url,
      position: row.position,
    })));
  }, [listId]);

  // listId が変わったらリスト情報と曲一覧を再取得
  useEffect(() => {
    fetchListInfo();
    fetchListSongs();
  }, [listId, fetchListInfo, fetchListSongs]);

  /* -------------------------------------------------------
     ★ 曲追加
  ------------------------------------------------------- */
  const handleAddSong = async (song) => {
    await addSongToList(listId, song.song_id);
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

        <SongList
          songs={songs}
          sortable={true}
          onChangeOrder={handleChangeOrder}
          onDeleted={handleDeleteSong}
          onAdd={handleAddSong}
          onClickSong={(songId) => navigate(`/songs/${songId}`)}
        />

        <SearchSong onAdd={handleAddSong} />
      </div>
    </div>
  );
}
