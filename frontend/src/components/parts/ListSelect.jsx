import { useEffect, useState } from "react";
import { getMyLists } from "../../lib/queries/lists";

export default function ListSelect({ selectedList, onSelectList }) {
  const [lists, setLists] = useState([]);

  /* -------------------------------------------------------
     ★ リスト一覧取得（認証必須・RLSで本人のリストのみ取得）
  ------------------------------------------------------- */
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
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid #ccc",
          fontSize: 16,
          marginBottom: 20
        }}
      >
        {/* デフォルト表示（選択不可） */}
        <option value="" disabled>
          別のリストへ移動
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
