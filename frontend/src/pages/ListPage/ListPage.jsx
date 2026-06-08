import { useEffect, useState } from "react";
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

  /* -------------------------------------------------------
     ★ リスト情報取得
  ------------------------------------------------------- */
  const fetchListInfo = async () => {
    const data = await getListDetail(listId);
    if (data) setListInfo(data);
  };

  /* -------------------------------------------------------
     ★ list_songs 取得
  ------------------------------------------------------- */
  const fetchListSongs = async () => {
    const data = await getListSongs(listId);

    const formatted = data.map((row) => ({
      id: row.id,
      song_id: row.song_id,
      title: row.song_title,
      artist: row.artist,
      anime_title: row.anime_title,
      type: row.song_type,
      image_url: row.image_url,
      position: row.position
    }));

    setSongs(formatted);
  };

  useEffect(() => {
    fetchListInfo();
    fetchListSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

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
