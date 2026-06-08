import { useState, useEffect } from "react";
import { renameList } from "../../lib/queries/lists";

export default function ListHeader({ listId, listInfo, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(listInfo?.name || "");

  // listInfo が更新されたら name も同期
  useEffect(() => {
    setName(listInfo?.name || "");
  }, [listInfo]);

  const saveName = async () => {
    if (!name.trim()) return;

    await renameList(listId, name);

    setEditing(false);
    onUpdated();
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {editing ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 6, fontSize: 16 }}
          />
          <button
            onClick={saveName}
            style={{
              padding: "6px 12px",
              background: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            保存
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{
              padding: "6px 12px",
              background: "#ccc",
              border: "none",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            キャンセル
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ margin: 0 }}>{listInfo?.name}</h2>

          <button
            onClick={() => setEditing(true)}
            style={{
              padding: "6px 12px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            名前変更
          </button>
        </div>
      )}
    </div>
  );
}
