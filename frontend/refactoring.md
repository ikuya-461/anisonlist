# リファクタリング計画

> **方針**: 機能・見た目は一切変えず、コードの読みやすさ・保守性・一貫性を高める。
> 各ステップは独立して実施・レビューできるよう小さく区切る。

---

## Step 1 — コメントアウトされたコードの削除

**対象ファイル:**
- `components/inputs/SearchSong.jsx:132` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
- `components/inputs/SearchSongPublic.jsx:132` — 同上
- `pages/ListPage/ListPage.jsx:59` — 同上
- `pages/Mypage/MyPage.jsx:204` — `// ★ upsert をやめて update を使う` などの作業メモコメント

**方針:**
- `eslint-disable` は「その場しのぎの抑制」ではなく、`useCallback` でラップする等の根本対処に変える
- 作業メモコメント（`★ upsert をやめた理由`等）は削除。意図を説明する必要があれば端的なJSDocに置き換える
- `// ①②③` 形式の処理ステップ番号コメントは統一スタイル（`// --- ① ログイン確認 ---`）に揃える

---

## Step 2 — マジックナンバー・マジック文字列の定数化

**対象:**

| 場所 | 値 | 定数名（案） |
|---|---|---|
| `lib/imageCache/animeImageCache.js:1` | `400` (ms) | `JIKAN_REQUEST_INTERVAL_MS` |
| `lib/imageCache/animeImageCache.js:13` | `https://api.jikan.moe/v4` | `JIKAN_API_BASE` |
| `lib/imageCache/songImageCache.js:15` | `https://itunes.apple.com/search` | `ITUNES_SEARCH_API` |
| `pages/SongDetail/SongDetail.jsx` | `"#ff6b6b"` `"#4dabf7"` `"#51cf66"` `"#adb5bd"` | `SONG_TYPE_COLORS` オブジェクト |
| `components/listItem/ListGallery.jsx:23` | `{ delay: 120, tolerance: 4 }` | `DND_ACTIVATION_CONSTRAINT` |

**方針:** 新規ファイル `lib/constants.js` を作成し、アプリ全体で共有する定数をまとめる。

---

## Step 3 — `PAGE_SIZE` とページネーション計算の共通化

**問題:**  
`PAGE_SIZE = 10` と `from / to / totalPages` の計算ロジックが以下3ファイルに完全重複している:
- `lib/queries/songs.js`
- `lib/queries/anime.js`
- `lib/queries/artists.js`

**方針:**  
`lib/constants.js` に `PAGE_SIZE` を移動し、ページネーション計算を `lib/utils/pagination.js` の共通ヘルパー関数としてまとめる。

```js
// lib/utils/pagination.js（イメージ）
export const calcRange = (page) => ({
  from: (page - 1) * PAGE_SIZE,
  to:   page * PAGE_SIZE - 1,
});
export const calcTotalPages = (count) =>
  Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
```

---

## Step 4 — `SearchSong` / `SearchSongPublic` の統合

**問題:**  
2つのコンポーネントが約300行ずつ（計600行）存在し、差異はわずか以下のみ:
- タイトル文字列（`アニソン検索（公開）` vs `アニソン検索（マイリスト用）`）
- `onAdd` propsの有無（マイリスト版にのみある「リストに追加」ボタン）
- 使用するCSSモジュールファイル

**方針:**  
`SearchSong.jsx` に統合し、`onAdd` props の有無で挙動を切り替える。`SearchSongPublic.jsx` は `SearchSong` の薄いラッパーとして残すか削除する。

```jsx
// 統合後のイメージ
<SearchSong onAdd={handleAdd} />   // マイリスト用（onAddあり）
<SearchSong />                     // 公開用（onAddなし）
```

---

## Step 5 — `MyPage.jsx` / `Register.jsx` をクエリ層に統一

**問題:**  
`lib/queries/users.js` に `getMyProfile` / `updateMyProfile` / `createUserProfile` が既に実装されているが、コンポーネントから使われていない:

- `pages/Mypage/MyPage.jsx:49` — プロフィール取得に直接 `supabase.from("users").select(...)` を呼んでいる
- `pages/Mypage/MyPage.jsx:79` — プロフィール更新に直接 `supabase.from("users").update(...)` を呼んでいる
- `pages/LoginRegister/Register.jsx:67` — ユーザー登録に直接 `supabase.from("users").insert(...)` を呼んでいる

**方針:**  
上記の直接呼び出しを `lib/queries/users.js` の対応関数に置き換え、データ取得ロジックをクエリ層に集約する。

---

## Step 6 — `createList` の引数設計を他の関数と統一

**問題:**  
`lib/queries/lists.js` の他の関数（`renameList`, `deleteList`）は内部で `supabase.auth.getUser()` を呼んでユーザーを取得するが、`createList(userId, name)` だけは `userId` を引数で受け取る設計になっている。呼び出し元（`CreateListButton.jsx`）がわざわざ `userId` を state で保持・渡している。

**方針:**  
`createList(name)` に変更し、内部で `auth.getUser()` を呼ぶ形に統一する。合わせて `CreateListButton.jsx` と `MyPage.jsx` の呼び出し箇所を修正する。

---

## Step 7 — 詳細ページの `useDetailPage` カスタムフック化

**問題:**  
`SongDetail.jsx`・`AnimeDetail.jsx`・`ArtistDetail.jsx` が以下の同一パターンを個別に実装している:
```js
const [data, setData]     = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetch = async () => {
    try { ... } catch (err) { console.error(...) } finally { setLoading(false); }
  };
  fetch();
}, [id]);

if (loading) return <div>読み込み中...</div>;
if (!data)   return <div>見つかりませんでした。</div>;
```

**方針:**  
`hooks/useDetailPage.js` としてカスタムフックを作成し、3ページで共通利用する。

```js
// hooks/useDetailPage.js（イメージ）
export function useDetailPage(fetchFn, id) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { ... }, [id]);
  return { data, loading };
}
```

---

## Step 8 — インライン `style` の CSS Modules への移行

**問題:**  
以下のコンポーネントがインライン `style={{...}}` を使用しており、CSS Modulesで統一されていない:

| ファイル | 状況 |
|---|---|
| `components/parts/Header.jsx` | CSSモジュールなし、全てインライン |
| `components/parts/Button.jsx` | CSSモジュールなし、全てインライン |
| `components/parts/Input.jsx` | CSSモジュールなし、全てインライン |
| `components/parts/ErrorMessage.jsx` | CSSモジュールなし、全てインライン |
| `components/parts/ListHeader.jsx` | CSSモジュールなし、全てインライン |
| `components/parts/ListSelect.jsx` | CSSモジュールなし、全てインライン |
| `pages/LoginRegister/Register.jsx` | ページ末尾にstyleオブジェクト定義 |
| `pages/SongDetail/SongDetail.jsx` | `typeBadge` の背景色のみインライン（Step 2で部分対応） |

**方針:**  
各コンポーネントに対応する CSS Modules ファイル（`*.module.css`）を作成し、インラインstyleを移行する。`Login.jsx` はすでにインラインstyleを使っているため、同時対応する。

---

## 優先順位まとめ

| # | 内容 | 影響範囲 | 難易度 |
|---|---|---|---|
| 1 | コメントアウト削除 | 小 | ★☆☆ |
| 2 | マジックナンバー定数化 | 中 | ★☆☆ |
| 3 | PAGE_SIZE・ページネーション共通化 | lib/queries 3ファイル | ★★☆ |
| 4 | SearchSong 統合 | コンポーネント2本 | ★★☆ |
| 5 | MyPage/Register をクエリ層に統一 | ページ2本 | ★★☆ |
| 6 | createList 引数設計の統一 | 関数1本＋呼び出し元 | ★☆☆ |
| 7 | useDetailPage カスタムフック化 | ページ3本 | ★★☆ |
| 8 | インラインstyle → CSS Modules | コンポーネント8本 | ★★★ |

> Step 1〜3 は互いに独立して安全に実施できる。  
> Step 4〜7 はそれぞれ独立しているが、ある程度まとめて実施した方がレビューしやすい。  
> Step 8 は影響範囲が広く、スタイル崩れのリスクがあるため最後に実施する。
