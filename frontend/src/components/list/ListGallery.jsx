import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import DeleteListButton from "../buttons/DeleteListButton";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./ListGallery.module.css";
import { DND_ACTIVATION_CONSTRAINT } from "../../lib/constants";

export default function ListGallery({ lists, setLists, onDeleted, onReorder, onTogglePublic }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: DND_ACTIVATION_CONSTRAINT
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lists.findIndex((l) => String(l.id) === active.id);
    const newIndex = lists.findIndex((l) => String(l.id) === over.id);

    const newLists = arrayMove(lists, oldIndex, newIndex);
    setLists(newLists);

    if (onReorder) onReorder(newLists);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={lists.map((l) => String(l.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.list}>
          {lists.map((list) => (
            <SortableItem key={list.id} list={list}>
              {(dragHandleProps) => (
                <GalleryItem
                  list={list}
                  dragHandleProps={dragHandleProps}
                  onDeleted={onDeleted}
                  onTogglePublic={onTogglePublic}
                />
              )}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* -------------------------------------------------------
   ソート可能ラッパー（dnd-kit）
------------------------------------------------------- */
function SortableItem({ list, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: String(list.id) });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

/* -------------------------------------------------------
   各リストのカード表示
------------------------------------------------------- */
function GalleryItem({ list, onDeleted, onTogglePublic, dragHandleProps }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className={styles.item}>
      <div className={styles.handle} {...dragHandleProps}>≡</div>

      <div className={styles.thumb} onClick={() => navigate(`/list/${list.id}`)}>
        {list.image_url ? (
          <img src={list.image_url} alt="thumb" />
        ) : (
          <div className={styles.noSong}>NO SONG</div>
        )}
      </div>

      <div className={styles.info} onClick={() => navigate(`/list/${list.id}`)}>
        <div className={styles.name}>{list.name}</div>
        {typeof list.like_count === "number" && (
          <div className={styles.likeCount}>❤️ {list.like_count}</div>
        )}
        {list.is_public && (
          <a
            href={`/public/${list.id}`}
            target="_blank"
            rel="noreferrer"
            className={styles.publicLink}
            onClick={(e) => e.stopPropagation()}
          >
            {t("list.publicPage")}
          </a>
        )}
      </div>

      <div className={styles.actions}>
        {onTogglePublic && (
          <button
            className={`${styles.publicToggle} ${list.is_public ? styles.publicToggleOn : ""}`}
            onClick={(e) => { e.stopPropagation(); onTogglePublic(list.id, list.is_public); }}
            title={list.is_public ? t("list.togglePublicOn") : t("list.togglePublicOff")}
          >
            {list.is_public ? "🌐" : "🔒"}
          </button>
        )}
        <DeleteListButton listId={list.id} onDeleted={onDeleted} />
      </div>
    </div>
  );
}
