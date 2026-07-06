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

import AnimeListCard from "./AnimeListCard";
import { DND_ACTIVATION_CONSTRAINT } from "../../lib/constants";

import styles from "./SongList.module.css";

/* =========================================================
   アニメリスト一覧（SongList の sortable 版と同型・CSS流用）
   ========================================================= */

function SortableAnimeItem({ item, onDeleted, onClickAnime }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(item.id) });

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
      <AnimeListCard
        item={item}
        onDeleted={onDeleted}
        onClick={onClickAnime}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default function AnimeList({ items, onDeleted, onChangeOrder, onClickAnime }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: DND_ACTIVATION_CONSTRAINT,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((s) => String(s.id) === active.id);
    const newIndex = items.findIndex((s) => String(s.id) === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex).map((s, i) => ({
      ...s,
      position: i,
    }));

    onChangeOrder?.(reordered);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((s) => String(s.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.listWrapper}>
          {items.map((item) => (
            <SortableAnimeItem
              key={item.id}
              item={item}
              onDeleted={onDeleted}
              onClickAnime={onClickAnime}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
