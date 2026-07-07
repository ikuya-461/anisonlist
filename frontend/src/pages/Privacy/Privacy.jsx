import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import styles from "./Privacy.module.css";

/* =========================================================
   プライバシーポリシー（ストア審査・公開URL要件）
   - 本文が長文のため i18n 辞書ではなくページ内で言語分岐
   ========================================================= */

const SECTIONS_JA = [
  {
    h: "1. 収集する情報",
    body: [
      "SONICLIST #1（以下「本サービス」）は、以下の情報を収集します。",
      "・アカウント情報：メールアドレス、パスワード（暗号化して保管）",
      "・プロフィール情報：ユーザー名、生まれた年、性別、自己紹介、アイコン画像URL",
      "・利用情報：作成したリスト、リストに追加した曲、タグ・メモ、いいね"
    ]
  },
  {
    h: "2. 利用目的",
    body: [
      "・アカウントの認証およびサービスの提供",
      "・プレイリスト作成・共有機能の提供",
      "・サービスの改善および利用状況の把握（統計的に処理し、個人を特定しない形で利用します）"
    ]
  },
  {
    h: "3. 第三者提供",
    body: [
      "法令に基づく場合を除き、収集した個人情報を第三者に提供することはありません。"
    ]
  },
  {
    h: "4. 外部サービスの利用",
    body: [
      "本サービスは以下の外部サービスを利用しています。",
      "・Supabase：データの保管・認証基盤",
      "・Netlify：サイトのホスティング",
      "・iTunes Search API / AniList / RAWG / MusicBrainz：楽曲・作品のジャケット画像や英語名等のメタデータ取得（これらのAPIへユーザーの個人情報を送信することはありません）"
    ]
  },
  {
    h: "5. Cookie等の利用",
    body: [
      "ログイン状態の保持および表示言語の設定のために、ブラウザのlocalStorage等を利用します。広告目的のトラッキングは行っていません。"
    ]
  },
  {
    h: "6. データの削除",
    body: [
      "マイページの「アカウントを削除」から、アカウントおよび関連する全てのデータ（リスト・いいね等）をいつでも完全に削除できます。"
    ]
  },
  {
    h: "7. ポリシーの改定",
    body: [
      "本ポリシーは必要に応じて改定されることがあります。重要な変更がある場合は、本サービス上でお知らせします。"
    ]
  },
  {
    h: "8. お問い合わせ",
    body: [
      "本ポリシーおよび本サービスに関するお問い合わせは、以下の連絡先までお願いいたします。",
      "メール：akasophia461@gmail.com"
    ]
  }
];

const SECTIONS_EN = [
  {
    h: "1. Information we collect",
    body: [
      "SONICLIST #1 (\"the Service\") collects the following information:",
      "- Account: email address and password (stored encrypted)",
      "- Profile: username, birth year, gender, bio, icon image URL",
      "- Usage: lists you create, songs you add, tags/notes, and likes"
    ]
  },
  {
    h: "2. How we use it",
    body: [
      "- Authentication and providing the Service",
      "- Playlist creation and sharing features",
      "- Service improvement and aggregated, non-identifying analytics"
    ]
  },
  {
    h: "3. Third-party disclosure",
    body: [
      "We do not share your personal information with third parties except where required by law."
    ]
  },
  {
    h: "4. External services",
    body: [
      "The Service uses the following external services:",
      "- Supabase: data storage and authentication",
      "- Netlify: site hosting",
      "- iTunes Search API / AniList / RAWG / MusicBrainz: fetching metadata such as cover art and English titles (no personal information is sent to these APIs)"
    ]
  },
  {
    h: "5. Cookies and local storage",
    body: [
      "We use browser localStorage to keep you signed in and remember your language preference. We do not use advertising trackers."
    ]
  },
  {
    h: "6. Data deletion",
    body: [
      "You can permanently delete your account and all related data (lists, likes, etc.) at any time from \"Delete account\" on your profile page."
    ]
  },
  {
    h: "7. Changes to this policy",
    body: [
      "This policy may be updated as needed. Significant changes will be announced on the Service."
    ]
  },
  {
    h: "8. Contact",
    body: [
      "For questions about this policy or the Service, please contact us at:",
      "Email: akasophia461@gmail.com"
    ]
  }
];

export default function Privacy() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const sections = lang === "en" ? SECTIONS_EN : SECTIONS_JA;

  return (
    <div className={styles.outer}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        {t("common.back")}
      </button>

      <h1 className={styles.title}>
        {lang === "en" ? "Privacy Policy" : "プライバシーポリシー"}
      </h1>
      <p className={styles.updated}>
        {lang === "en" ? "Last updated: July 4, 2026" : "制定日：2026年7月4日"}
      </p>

      {sections.map((s) => (
        <section key={s.h} className={styles.section}>
          <h2 className={styles.heading}>{s.h}</h2>
          {s.body.map((line, i) => (
            <p key={i} className={styles.text}>{line}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
