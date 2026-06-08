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
import ListGalleryItem from "./ListGalleryItem";
import styles from "../../CSS/ComponentCSS/ListGallery.module.css";

export default function ListGallery({ lists, setLists, onDeleted, onReorder }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 120, tolerance: 4 }
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
        items={lists.map((l) => String(l.id))}  // ← ★ id を string に変換
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.list}>
          {lists.map((list) => (
            <SortableItem key={list.id} list={list}>
              {(dragHandleProps) => (
                <ListGalleryItem
                  list={list}
                  dragHandleProps={dragHandleProps}
                  onDeleted={onDeleted}
                />
              )}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ list, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: String(list.id) }); // ← ★ id を string に変換

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {children({
        ...attributes,
        ...listeners,
      })}
    </div>
  );
}
