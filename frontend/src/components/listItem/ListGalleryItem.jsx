import { useNavigate } from "react-router-dom";
import DeleteListButton from "../buttons/DeleteListButton";
import styles from "../../CSS/ComponentCSS/ListGalleryItem.module.css";

export default function ListGalleryItem({ list, onDeleted, dragHandleProps }) {
  const navigate = useNavigate();

  return (
    <div className={styles.item}>
      {/* ドラッグハンドル */}
      <div className={styles.handle} {...dragHandleProps}>≡</div>

      {/* サムネイル */}
      <div className={styles.thumb} onClick={() => navigate(`/list/${list.id}`)}>
        {list.image_url ? (
          <img src={list.image_url} alt="thumb" />
        ) : (
          <div className={styles.noSong}>NO SONG</div>
        )}
      </div>

      {/* リスト名 */}
      <div className={styles.info} onClick={() => navigate(`/list/${list.id}`)}>
        <div className={styles.name}>{list.name}</div>
      </div>

      {/* 削除ボタン */}
      <div className={styles.delete}>
        <DeleteListButton listId={list.id} onDeleted={onDeleted} />
      </div>
    </div>
  );
}

