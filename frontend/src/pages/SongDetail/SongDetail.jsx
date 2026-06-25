import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSongDetail, updateYoutubeId } from "../../lib/queries/songs";
import { useDetailPage } from "../../hooks/useDetailPage";
import { SONG_TYPE_COLORS } from "../../lib/constants";
import { supabase } from "../../lib/supabaseClient";
import pageStyles from "../DetailPage.module.css";
import styles from "./SongDetail.module.css";

// YouTube URL から ID を抽出するヘルパー
function extractYoutubeId(input) {
  if (!input) return null;
  // すでに ID 形式（11文字）ならそのまま
  if (/^[A-Za-z0-9_-]{11}$/.test(input.trim())) return input.trim();
  // URL から抽出
  const match = input.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: song, loading } = useDetailPage(getSongDetail, id);

  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [ytInput, setYtInput] = useState("");
  const [ytEditing, setYtEditing] = useState(false);
  const [ytSaving, setYtSaving] = useState(false);
  const [currentYtId, setCurrentYtId] = useState(null);

  // ログイン状態を確認
  useState(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  });

  // song がロードされたら youtube_id を初期化
  const [ytInitialized, setYtInitialized] = useState(false);
  if (song && !ytInitialized) {
    setCurrentYtId(song.youtube_id || null);
    setYtInitialized(true);
  }

  const handleYtSave = async () => {
    const extracted = extractYoutubeId(ytInput);
    setYtSaving(true);
    const ok = await updateYoutubeId(id, extracted);
    if (ok) {
      setCurrentYtId(extracted);
      setYtEditing(false);
      setYtInput("");
    }
    setYtSaving(false);
  };

  if (loading) return <div className={pageStyles.loading}>読み込み中...</div>;
  if (!song) return <div className={pageStyles.loading}>曲が見つかりませんでした。</div>;

  const typeColor = SONG_TYPE_COLORS[song.song_type] ?? SONG_TYPE_COLORS.default;

  // 表示用アーティスト名（ボカロはボーカルを連結）
  const displayArtist =
    song.artist || (song.vocalists ?? []).map((v) => v.name).join(", ") || "";

  const xShareUrl = (() => {
    const text = `🎵 ${song.song_title}${displayArtist ? ` / ${displayArtist}` : ""}${song.anime_title ? `（${song.anime_title}）` : ""}\n#SONICLIST #アニソン`;
    const url = window.location.href;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  })();

  const formattedDate = song.release_date
    ? new Date(song.release_date).toISOString().split("T")[0]
    : "不明";

  const renderArtist = (name, artistId) => {
    if (!name) return "不明";
    if (!artistId) return name;

    return (
      <span
        className={styles.artistLink}
        onClick={() => navigate(`/artist/${artistId}`)}
      >
        {name}
      </span>
    );
  };

  // 複数人（ボカロのボーカル/プロデューサー）をリンク付きで並べる
  const renderArtistList = (people) => {
    if (!people || people.length === 0) return "不明";
    return people.map((p, i) => (
      <span key={p.id ?? p.name}>
        {i > 0 && "、"}
        {renderArtist(p.name, p.id)}
      </span>
    ));
  };

  const isVocaloid = song.category === "vocaloid";

  return (
    <div className={styles.outer}>
      {/* 戻る */}
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        ← 戻る
      </button>

      {/* 画像（fallback あり） */}
      <img
        src={song.image_url || "/noimage.png"}
        alt="anime"
        className={styles.image}
      />

      {/* タイトル + タイプ */}
      <div className={styles.titleRow}>
        {song.song_type && (
          <span className={styles.typeBadge} style={{ background: typeColor }}>
            {song.song_type}
            {song.sequence ? ` ${song.sequence}` : ""}
          </span>
        )}

        <h1 className={styles.title}>{song.song_title}</h1>
      </div>

      {/* アニメタイトル（クリックで遷移）。ボカロ曲は紐づくアニメが無いので非表示 */}
      {!isVocaloid && song.anime_id && (
        <div
          className={styles.animeTitle}
          onClick={() => navigate(`/anime/${song.anime_id}`)}
        >
          🎬 {song.anime_title}
        </div>
      )}

      {/* YouTube 埋め込み */}
      <div className={styles.youtubeSection}>
        {currentYtId ? (
          <div className={styles.youtubeWrapper}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${currentYtId}`}
              title="YouTube player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={styles.youtubeFrame}
            />
          </div>
        ) : (
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.song_title} ${displayArtist}`)}`}
            target="_blank"
            rel="noreferrer"
            className={styles.ytSearchLink}
          >
            ▶ YouTubeで検索
          </a>
        )}

        {/* YouTube ID 登録（ログイン済みのみ） */}
        {isLoggedIn && (
          <div className={styles.ytEdit}>
            {ytEditing ? (
              <div className={styles.ytInputRow}>
                <input
                  className={styles.ytInput}
                  value={ytInput}
                  onChange={(e) => setYtInput(e.target.value)}
                  placeholder="YouTube URL または動画ID"
                />
                <button className={styles.ytSaveBtn} onClick={handleYtSave} disabled={ytSaving}>
                  {ytSaving ? "保存中..." : "保存"}
                </button>
                <button className={styles.ytCancelBtn} onClick={() => { setYtEditing(false); setYtInput(""); }}>
                  キャンセル
                </button>
              </div>
            ) : (
              <button className={styles.ytEditBtn} onClick={() => setYtEditing(true)}>
                {currentYtId ? "▶ YouTube IDを変更" : "▶ YouTube IDを登録"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* X シェアボタン */}
      <a
        href={xShareUrl}
        target="_blank"
        rel="noreferrer"
        className={styles.xShareBtn}
      >
        𝕏 この曲をシェア
      </a>

      {/* 詳細情報 */}
      <div className={styles.infoBox}>
        {isVocaloid ? (
          <>
            <div>
              <strong>ボーカル：</strong>
              {renderArtistList(song.vocalists)}
            </div>
            <div>
              <strong>プロデューサー：</strong>
              {renderArtistList(song.producers)}
            </div>
          </>
        ) : (
          <>
            <div>
              <strong>歌手：</strong>
              {renderArtist(song.artist, song.artist_id)}
            </div>
            <div>
              <strong>作詞：</strong>
              {renderArtist(song.lyricist, song.lyricist_id)}
            </div>
            <div>
              <strong>作曲：</strong>
              {renderArtist(song.composer, song.composer_id)}
            </div>
            <div>
              <strong>編曲：</strong>
              {renderArtist(song.arranger, song.arranger_id)}
            </div>
          </>
        )}
        <div><strong>公開日：</strong>{formattedDate}</div>

        {/* 曲情報 */}
        <div className={styles.songInfo}>
          <strong>曲情報：</strong>
          <div className={styles.songInfoText}>
            {song.song_info || "なし"}
          </div>
        </div>
      </div>
    </div>
  );
}
