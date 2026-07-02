import { useEffect, useState } from "react";
import { getMyLists } from "../../lib/queries/lists";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./ListSelect.module.css";

export default function ListSelect({ selectedList, onSelectList }) {
  const { t } = useLanguage();
  const [lists, setLists] = useState([]);

  const fetchLists = async () => {
    try {
      const data = await getMyLists();
      setLists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ fetchLists ERROR:", err);
      setLists([]);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  return (
    <div>
      <select
        value=""
        onChange={(e) => {
          const value = e.target.value;
          if (!value) return;
          onSelectList(value);
        }}
        className={styles.select}
      >
        {/* デフォルト表示（選択不可） */}
        <option value="" disabled>
          {t("list.moveToOther")}
        </option>

        {/* 今開いているリストは除外 */}
        {lists
          .filter((list) => String(list.id) !== String(selectedList))
          .map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
      </select>
    </div>
  );
}
