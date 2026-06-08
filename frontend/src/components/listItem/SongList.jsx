import ListPageSongCard from "./ListPageSongCard";
import SongCard from "./SongCard";

import styles from "../../CSS/ComponentCSS/SongList.module.css";

export default function SongList({
  songs,
  sortable = false,
  onAdd,
  onDeleted,
  onChangeOrder,
  onClickSong
}) {
  /* -------------------------------------------------------
     🚀 並び替え（sortable=true の時だけ）
  ------------------------------------------------------- */
  const handleDrag = (sourceIndex, destIndex) => {
    if (sourceIndex === destIndex) return;

    const newSongs = Array.from(songs);
    const [moved] = newSongs.splice(sourceIndex, 1);
    newSongs.splice(destIndex, 0, moved);

    const reordered = newSongs.map((s, i) => ({
      ...s,
      position: i
    }));

    onChangeOrder?.(reordered);
  };

  /* -------------------------------------------------------
     🚀 カード描画（sortable / non-sortable）
  ------------------------------------------------------- */
  const renderCard = (song, index, dragHandleProps) => {
    if (sortable) {
      return (
        <ListPageSongCard
          key={song.id}
          song={song}
          onDeleted={onDeleted}
          onClick={() => onClickSong?.(song.song_id)}
          dragHandleProps={dragHandleProps}
        />
      );
    }

    return (
      <SongCard
        key={song.song_id}
        song={song}
        onAdd={onAdd}
        onClick={() => onClickSong?.(song.song_id)}
      />
    );
  };

  /* -------------------------------------------------------
     🚀 並び替えあり（ListPage 用）
  ------------------------------------------------------- */
  if (sortable) {
    return (
      <div className={styles.listWrapper}>
        {songs.map((song, index) =>
          renderCard(song, index, {
            draggable: true,
            onDragStart: (e) => {
              e.dataTransfer.setData("text/plain", index);
            },
            onDragOver: (e) => e.preventDefault(),
            onDrop: (e) => {
              const sourceIndex = Number(e.dataTransfer.getData("text/plain"));
              const destIndex = index;
              handleDrag(sourceIndex, destIndex);
            }
          })
        )}
      </div>
    );
  }

  /* -------------------------------------------------------
     🚀 並び替えなし（SearchSong / SearchSongPublic 用）
  ------------------------------------------------------- */
  return (
    <div className={styles.grid}>
      {songs.map((song) => renderCard(song))}
    </div>
  );
}
