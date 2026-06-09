import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { searchSongs } from "../../lib/queries/songs";
import { searchAnime, getAnimeDetail } from "../../lib/queries/anime";
import { searchArtists, getArtistDetail } from "../../lib/queries/artists";

import SongList from "../list/SongList";
import MediaCard from "../cards/MediaCard";
import Input from "../ui/Input";
import Button from "../ui/Button";
import ErrorMessage from "../ui/ErrorMessage";

import styles from "./SearchSong.module.css";
import gridStyles from "../list/SongList.module.css";

const TABS = [
  { key: "song", label: "曲" },
  { key: "anime", label: "アニメ" },
  { key: "artist", label: "アーティスト" }
];

export default function SearchSong({ onAdd, heading = "ADD TO LIST" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState(searchParams.get("tab") || "song");

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [artist, setArtist] = useState(searchParams.get("artist") || "");
  const [anime, setAnime] = useState(searchParams.get("anime") || "");
  const [type, setType] = useState(searchParams.get("type") || "");

  // タブ別の検索語（アニメ／アーティスト検索欄）
  const [animeKeyword, setAnimeKeyword] = useState(searchParams.get("q") || "");
  const [artistKeyword, setArtistKeyword] = useState(searchParams.get("q") || "");

  const [page, setPage] = useState(Number(searchParams.get("page") || 1));

  const [results, setResults] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // アニメ/アーティストの曲ピッカー
  const [pickerMedia, setPickerMedia]   = useState(null);  // { type, id, name }
  const [pickerSongs, setPickerSongs]   = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const [hasSearched, setHasSearched] = useState(
    Boolean(
      searchParams.get("keyword") ||
        searchParams.get("artist") ||
        searchParams.get("anime") ||
        searchParams.get("q")
    )
  );

  const [errorMessage, setErrorMessage] = useState("");

  const getPageNumbers = (current, total) => {
    const pages = [];
    pages.push(1);

    if (current > 3) pages.push("…");

    for (let i = current - 1; i <= current + 1; i++) {
      if (i > 1 && i < total) pages.push(i);
    }

    if (current < total - 2) pages.push("…");

    if (total > 1) pages.push(total);

    return pages;
  };

  /* -------------------------------------------------------
     🎯 楽曲検索（ログイン版）
  ------------------------------------------------------- */
  const fetchSongs = async (targetPage) => {
    const data = await searchSongs({ keyword, artist, anime, type, page: targetPage });

    const formatted = data.songs.map((row) => ({
      id: row.id,
      song_id: row.id,

      title: row.song_title,
      song_title: row.song_title,

      artist: row.artist,
      artist_name: row.artist,

      anime_title: row.anime_title,

      type: row.song_type,
      sequence: row.sequence || null,

      image_url: row.image_url || null
    }));

    setResults(formatted);
    setTotalPages(data.totalPages || 1);
  };

  /* -------------------------------------------------------
     🎯 アニメ検索
  ------------------------------------------------------- */
  const fetchAnime = async (targetPage) => {
    const data = await searchAnime({ keyword: animeKeyword, page: targetPage });
    setResults(data.anime);
    setTotalPages(data.totalPages || 1);
  };

  /* -------------------------------------------------------
     🎯 アーティスト検索
  ------------------------------------------------------- */
  const fetchArtists = async (targetPage) => {
    const data = await searchArtists({ keyword: artistKeyword, page: targetPage });
    setResults(data.artists);
    setTotalPages(data.totalPages || 1);
  };

  const fetchByTab = async (targetPage) => {
    setLoading(true);
    setErrorMessage("");

    if (tab === "anime") await fetchAnime(targetPage);
    else if (tab === "artist") await fetchArtists(targetPage);
    else await fetchSongs(targetPage);

    setLoading(false);
  };

  const updateURL = (newPage) => {
    if (tab === "anime") {
      setSearchParams({ tab, q: animeKeyword, page: newPage });
    } else if (tab === "artist") {
      setSearchParams({ tab, q: artistKeyword, page: newPage });
    } else {
      setSearchParams({ tab, keyword, artist, anime, type, page: newPage });
    }
  };

  const handleSearch = () => {
    setErrorMessage("");

    if (tab === "anime" && !animeKeyword) {
      setErrorMessage("アニメタイトルを入力してください");
      return;
    }

    if (tab === "artist" && !artistKeyword) {
      setErrorMessage("アーティスト名を入力してください");
      return;
    }

    if (tab === "song" && !keyword && !artist && !anime) {
      setErrorMessage("曲名・歌手名・アニメタイトルのいずれかを入力してください");
      return;
    }

    setResults([]);
    setPage(1);
    updateURL(1);
    setHasSearched(true);
    fetchByTab(1);
  };

  // URL 更新 + 直接 fetch（useEffect 経由ではなく同期的に呼ぶことでレース条件を防ぐ）
  const changePage = (newPage) => {
    setPage(newPage);
    updateURL(newPage);
    fetchByTab(newPage);
  };

  // アニメ/アーティストカードクリック（onAdd がある = ListPage）
  const openPicker = async (type, id, name) => {
    setPickerMedia({ type, id, name });
    setPickerSongs([]);
    setPickerLoading(true);

    if (type === "anime") {
      const detail = await getAnimeDetail(id);
      setPickerSongs(
        (detail?.songs ?? []).map((s) => ({
          id: s.song_id,
          song_id: s.song_id,
          title: s.song_title,
          song_title: s.song_title,
          type: s.song_type,
          image_url: s.image_url,
          artist: s.artist,
          anime_title: name,
        }))
      );
    } else {
      const detail = await getArtistDetail(id);
      setPickerSongs(
        (detail?.songs ?? []).map((s) => ({
          id: s.song_id,
          song_id: s.song_id,
          title: s.song_title,
          song_title: s.song_title,
          type: s.song_type,
          image_url: s.image_url,
          artist: detail?.artist?.name ?? s.artist,
          anime_title: s.anime_title,
        }))
      );
    }

    setPickerLoading(false);
  };

  const closePicker = () => {
    setPickerMedia(null);
    setPickerSongs([]);
  };

  const switchTab = (newTab) => {
    if (newTab === tab) return;

    setTab(newTab);
    setResults([]);
    setHasSearched(false);
    setErrorMessage("");
    setPage(1);
    setPickerMedia(null);
    setPickerSongs([]);
    setSearchParams({ tab: newTab });
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>{heading}</h3>

      {/* タブ切り替え */}
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tabBtn} ${tab === t.key ? styles.activeTab : ""}`}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ErrorMessage>{errorMessage}</ErrorMessage>

      {/* 検索フォーム（タブ別） */}
      {tab === "song" && (
        <div className={styles.form}>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="曲名" />
          <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="歌手名" />
          <Input value={anime} onChange={(e) => setAnime(e.target.value)} placeholder="アニメタイトル" />

          <select value={type} onChange={(e) => setType(e.target.value)} className={styles.select}>
            <option value="">すべて</option>
            <option value="OP">OP</option>
            <option value="ED">ED</option>
            <option value="IN">挿入歌</option>
            <option value="OTHER">その他</option>
          </select>
        </div>
      )}

      {tab === "anime" && (
        <div className={styles.form}>
          <Input
            value={animeKeyword}
            onChange={(e) => setAnimeKeyword(e.target.value)}
            placeholder="アニメタイトル"
          />
        </div>
      )}

      {tab === "artist" && (
        <div className={styles.form}>
          <Input
            value={artistKeyword}
            onChange={(e) => setArtistKeyword(e.target.value)}
            placeholder="アーティスト名"
          />
        </div>
      )}

      <Button onClick={handleSearch} disabled={loading} className={styles.searchBtn}>
        {loading ? "検索中..." : "検索"}
      </Button>

      {/* 検索結果（タブ別表示） */}
      {hasSearched && tab === "song" && (
        <SongList
          songs={results}
          sortable={false}
          onAdd={onAdd}
          onClickSong={(id) => navigate(`/songs/${id}`)}
        />
      )}

      {/* アニメ/アーティスト：曲ピッカーが開いているとき */}
      {pickerMedia && (
        <div className={styles.picker}>
          <button className={styles.pickerBack} onClick={closePicker}>
            ← {pickerMedia.name} の検索結果に戻る
          </button>
          <p className={styles.pickerTitle}>
            {pickerMedia.type === "anime" ? "🎬" : "🎤"} {pickerMedia.name} の曲
          </p>
          {pickerLoading ? (
            <p className={styles.pickerEmpty}>読み込み中...</p>
          ) : pickerSongs.length === 0 ? (
            <p className={styles.pickerEmpty}>曲が見つかりませんでした。</p>
          ) : (
            <SongList
              songs={pickerSongs}
              sortable={false}
              onAdd={onAdd}
              onClickSong={(id) => navigate(`/songs/${id}`)}
            />
          )}
        </div>
      )}

      {hasSearched && !pickerMedia && tab === "anime" && (
        <div className={gridStyles.grid}>
          {results.map((a) => (
            <MediaCard
              key={a.id}
              type="anime"
              data={a}
              onClick={(id) => onAdd
                ? openPicker("anime", id, a.title_jp)
                : navigate(`/anime/${id}`)
              }
            />
          ))}
        </div>
      )}

      {hasSearched && !pickerMedia && tab === "artist" && (
        <div className={gridStyles.grid}>
          {results.map((a) => (
            <MediaCard
              key={a.id}
              type="artist"
              data={a}
              onClick={(id) => onAdd
                ? openPicker("artist", id, a.name)
                : navigate(`/artist/${id}`)
              }
            />
          ))}
        </div>
      )}

      {hasSearched && (
        <div className={styles.pagination}>
          <Button disabled={page <= 1} onClick={() => changePage(page - 1)} className={styles.pageBtn}>
            ← 前へ
          </Button>

          {getPageNumbers(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={i} className={styles.dots}>…</span>
            ) : (
              <Button
                key={i}
                onClick={() => changePage(p)}
                className={`${styles.pageBtn} ${page === p ? styles.activePage : ""}`}
              >
                {p}
              </Button>
            )
          )}

          <Button disabled={page >= totalPages} onClick={() => changePage(page + 1)} className={styles.pageBtn}>
            次へ →
          </Button>
        </div>
      )}
    </div>
  );
}
