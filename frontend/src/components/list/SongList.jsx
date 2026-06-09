import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import ListPageSongCard from "./ListPageSongCard";
import SongCard from "../cards/SongCard";
import { DND_ACTIVATION_CONSTRAINT } from "../../lib/constants";

import styles from "./SongList.module.css";

/* -------------------------------------------------------
   ソート可能ラッパー（ListGallery と同じ構造）
------------------------------------------------------- */
function SortableSongItem({ song, onDeleted, onClickSong }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(song.id) });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : "auto",
      }}
    >
      <ListPageSongCard
        song={song}
        onDeleted={onDeleted}
        onClick={onClickSong}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

/* -------------------------------------------------------
   メインコンポーネント
------------------------------------------------------- */
export default function SongList({
  songs,
  sortable = false,
  onAdd,
  onDeleted,
  onChangeOrder,
  onClickSong,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: DND_ACTIVATION_CONSTRAINT,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = songs.findIndex((s) => String(s.id) === active.id);
    const newIndex = songs.findIndex((s) => String(s.id) === over.id);
    const reordered = arrayMove(songs, oldIndex, newIndex).map((s, i) => ({
      ...s,
      position: i,
    }));

    onChangeOrder?.(reordered);
  };

  /* 並び替えあり（ListPage 用） */
  if (sortable) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={songs.map((s) => String(s.id))}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.listWrapper}>
            {songs.map((song) => (
              <SortableSongItem
                key={song.id}
                song={song}
                onDeleted={onDeleted}
                onClickSong={() => onClickSong?.(song.song_id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  /* 並び替えなし（SearchSong / SearchSongPublic 用） */
  return (
    <div className={styles.grid}>
      {songs.map((song) => (
        <SongCard
          key={song.song_id}
          song={song}
          onAdd={onAdd}
          onClick={() => onClickSong?.(song.song_id)}
        />
      ))}
    </div>
  );
}
