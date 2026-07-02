import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { searchSongs } from "../../lib/queries/songs";
import { searchAnime, getAnimeDetail } from "../../lib/queries/anime";
import { searchGames, getGameDetail } from "../../lib/queries/games";
import { searchArtists, getArtistDetail } from "../../lib/queries/artists";

import SongList from "../list/SongList";
import MediaCard from "../cards/MediaCard";
import Input from "../ui/Input";
import Button from "../ui/Button";
import ErrorMessage from "../ui/ErrorMessage";
import { SongListSkeleton, MediaGridSkeleton } from "../ui/Skeleton";
import { useLanguage } from "../../contexts/LanguageContext";
import { valueLabel, SONG_TYPE_LABELS, SEASON_LABELS, CATEGORY_LABELS } from "../../lib/i18n";
import { animeTitle, gameTitle, artistName } from "../../lib/displayText";

import styles from "./SearchSong.module.css";
import gridStyles from "../list/SongList.module.css";

const TABS = [
  { key: "song",   labelKey: "search.tab.song" },
  { key: "anime",  labelKey: "search.tab.anime" },
  { key: "game",   labelKey: "search.tab.game" },
  { key: "artist", labelKey: "search.tab.artist" }
];

// 年代セレクタの選択肢（今年〜1950年）
const YEARS = [];
for (let y = new Date().getFullYear(); y >= 1950; y--) YEARS.push(y);

// シーズン（DBの release_season 値。ラベルは i18n の SEASON_LABELS を使用）
const SEASONS = ["冬アニメ", "春アニメ", "夏アニメ", "秋アニメ"];

// カテゴリー（DBの category 値。ラベルは i18n の CATEGORY_LABELS を使用）
const CATEGORIES = ["anime", "vocaloid", "Vtuber", "game"];

// 曲タイプ（song_type_enum の値そのまま）
const SONG_TYPES = [
  "OP", "ED", "挿入歌", "テーマソング", "イメージソング", "CMソング",
  "アレンジ曲", "アレンジ原曲", "スピンオフ", "非公式関連曲",
  "ボカロ曲", "オリジナル曲", "なし", "不明"
];

export default function SearchSong({ onAdd, heading }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const resolvedHeading = heading ?? t("search.heading.addToList");

  const [tab, setTab] = useState(searchParams.get("tab") || "song");

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [artist, setArtist] = useState(searchParams.get("artist") || "");
  const [anime, setAnime] = useState(searchParams.get("anime") || "");
  const [type, setType] = useState(searchParams.get("type") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [year, setYear] = useState(searchParams.get("year") || "");

  // タブ別の検索語（アニメ／アーティスト検索欄）
  const [animeKeyword, setAnimeKeyword] = useState(searchParams.get("q") || "");
  const [animeYear, setAnimeYear] = useState(searchParams.get("year") || "");
  const [animeSeason, setAnimeSeason] = useState(searchParams.get("season") || "");
  const [gameKeyword, setGameKeyword] = useState(searchParams.get("q") || "");
  const [gameYear, setGameYear] = useState(searchParams.get("year") || "");
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
    const data = await searchSongs({ keyword, artist, anime, type, category, year, page: targetPage });

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
    const data = await searchAnime({
      keyword: animeKeyword,
      year: animeYear,
      season: animeSeason,
      page: targetPage
    });
    setResults(data.anime);
    setTotalPages(data.totalPages || 1);
  };

  /* -------------------------------------------------------
     🎯 ゲーム検索
  ------------------------------------------------------- */
  const fetchGames = async (targetPage) => {
    const data = await searchGames({
      keyword: gameKeyword,
      year: gameYear,
      page: targetPage
    });
    setResults(data.games);
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
    else if (tab === "game") await fetchGames(targetPage);
    else if (tab === "artist") await fetchArtists(targetPage);
    else await fetchSongs(targetPage);

    setLoading(false);
  };

  const updateURL = (newPage) => {
    if (tab === "anime") {
      setSearchParams({ tab, q: animeKeyword, year: animeYear, season: animeSeason, page: newPage });
    } else if (tab === "game") {
      setSearchParams({ tab, q: gameKeyword, year: gameYear, page: newPage });
    } else if (tab === "artist") {
      setSearchParams({ tab, q: artistKeyword, page: newPage });
    } else {
      setSearchParams({ tab, keyword, artist, anime, type, category, year, page: newPage });
    }
  };

  // 各タブで検索に必要な条件が無ければ検索不可
  const searchDisabled =
    tab === "anime"
      ? !animeKeyword.trim() && !animeYear && !animeSeason
      : tab === "game"
      ? !gameKeyword.trim() && !gameYear
      : tab === "artist"
      ? !artistKeyword.trim()
      : !keyword.trim() && !artist.trim() && !anime.trim();

  const handleSearch = () => {
    setErrorMessage("");

    if (tab === "anime" && !animeKeyword.trim() && !animeYear && !animeSeason) {
      setErrorMessage(t("search.err.animeNeed"));
      return;
    }

    if (tab === "game" && !gameKeyword.trim() && !gameYear) {
      setErrorMessage(t("search.err.gameNeed"));
      return;
    }

    if (tab === "artist" && !artistKeyword) {
      setErrorMessage(t("search.err.artistNeed"));
      return;
    }

    if (tab === "song" && !keyword.trim() && !artist.trim() && !anime.trim()) {
      setErrorMessage(t("search.err.songNeed"));
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
    } else if (type === "game") {
      const detail = await getGameDetail(id);
      setPickerSongs(
        (detail?.songs ?? []).map((s) => ({
          id: s.song_id,
          song_id: s.song_id,
          title: s.song_title,
          song_title: s.song_title,
          type: s.song_type,
          image_url: s.image_url,
          artist: s.artist,
          game_title: name,
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
      <h3 className={styles.heading}>{resolvedHeading}</h3>

      {/* タブ切り替え */}
      <div className={styles.tabs}>
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            className={`${styles.tabBtn} ${tab === tabItem.key ? styles.activeTab : ""}`}
            onClick={() => switchTab(tabItem.key)}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      <ErrorMessage>{errorMessage}</ErrorMessage>

      {/* 検索フォーム（タブ別） */}
      {tab === "song" && (
        <div className={styles.form}>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t("search.ph.songTitle")} />
          <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={t("search.ph.artist")} />
          <Input value={anime} onChange={(e) => setAnime(e.target.value)} placeholder={t("search.ph.animeTitle")} />

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("search.label.category")}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={styles.select}
            >
              <option value="">{t("common.all")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{valueLabel(CATEGORY_LABELS, c, lang)}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("search.label.songType")}</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={styles.select}>
              <option value="">{t("common.all")}</option>
              {SONG_TYPES.map((st) => (
                <option key={st} value={st}>{valueLabel(SONG_TYPE_LABELS, st, lang)}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("search.label.year")}</span>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={styles.select}>
              <option value="">{t("common.all")}</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{t("search.year.suffix", { year: y })}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {tab === "anime" && (
        <div className={styles.form}>
          <Input
            value={animeKeyword}
            onChange={(e) => setAnimeKeyword(e.target.value)}
            placeholder={t("search.ph.animeTitle")}
          />

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("search.label.year")}</span>
            <select
              value={animeYear}
              onChange={(e) => setAnimeYear(e.target.value)}
              className={styles.select}
            >
              <option value="">{t("common.all")}</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{t("search.year.suffix", { year: y })}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("search.label.season")}</span>
            <select
              value={animeSeason}
              onChange={(e) => setAnimeSeason(e.target.value)}
              className={styles.select}
            >
              <option value="">{t("common.all")}</option>
              {SEASONS.map((s) => (
                <option key={s} value={s}>{valueLabel(SEASON_LABELS, s, lang)}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {tab === "game" && (
        <div className={styles.form}>
          <Input
            value={gameKeyword}
            onChange={(e) => setGameKeyword(e.target.value)}
            placeholder={t("search.ph.gameTitle")}
          />

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("search.label.year")}</span>
            <select
              value={gameYear}
              onChange={(e) => setGameYear(e.target.value)}
              className={styles.select}
            >
              <option value="">{t("common.all")}</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{t("search.year.suffix", { year: y })}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {tab === "artist" && (
        <div className={styles.form}>
          <Input
            value={artistKeyword}
            onChange={(e) => setArtistKeyword(e.target.value)}
            placeholder={t("search.ph.artistName")}
          />
        </div>
      )}

      <Button onClick={handleSearch} disabled={loading || searchDisabled} className={styles.searchBtn}>
        {loading ? t("common.searching") : t("common.search")}
      </Button>

      {/* 検索結果（タブ別表示） */}
      {loading && !pickerMedia && (
        tab === "song"
          ? <SongListSkeleton count={6} />
          : <MediaGridSkeleton count={6} />
      )}

      {!loading && hasSearched && tab === "song" && (
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
            {t("search.picker.back", { name: pickerMedia.name })}
          </button>
          <p className={styles.pickerTitle}>
            {pickerMedia.type === "anime" ? "🎬" : pickerMedia.type === "game" ? "🎮" : "🎤"} {t("search.picker.songs", { name: pickerMedia.name })}
          </p>
          {pickerLoading ? (
            <SongListSkeleton count={5} />
          ) : pickerSongs.length === 0 ? (
            <p className={styles.pickerEmpty}>{t("search.picker.empty")}</p>
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

      {!loading && hasSearched && !pickerMedia && tab === "anime" && (
        <div className={gridStyles.grid}>
          {results.map((a) => (
            <MediaCard
              key={a.id}
              type="anime"
              data={a}
              onClick={(id) => onAdd
                ? openPicker("anime", id, animeTitle(a, lang))
                : navigate(`/anime/${id}`)
              }
            />
          ))}
        </div>
      )}

      {!loading && hasSearched && !pickerMedia && tab === "game" && (
        <div className={gridStyles.grid}>
          {results.map((g) => (
            <MediaCard
              key={g.id}
              type="game"
              data={g}
              onClick={(id) => onAdd
                ? openPicker("game", id, gameTitle(g, lang))
                : navigate(`/game/${id}`)
              }
            />
          ))}
        </div>
      )}

      {!loading && hasSearched && !pickerMedia && tab === "artist" && (
        <div className={gridStyles.grid}>
          {results.map((a) => (
            <MediaCard
              key={a.id}
              type="artist"
              data={a}
              onClick={(id) => onAdd
                ? openPicker("artist", id, artistName(a, lang))
                : navigate(`/artist/${id}`)
              }
            />
          ))}
        </div>
      )}

      {hasSearched && (
        <div className={styles.pagination}>
          <Button disabled={page <= 1} onClick={() => changePage(page - 1)} className={styles.pageBtn}>
            {t("search.pager.prev")}
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
            {t("search.pager.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
