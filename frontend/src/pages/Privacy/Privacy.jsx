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
      "・プロフィール情報：ユーザー名、生まれた年、性別、自己紹介、アイコン画像（アップロードされた画像ファイル）",
      "・利用情報：作成した曲リスト・アニメリスト、追加した曲・作品、タグ・メモ、いいね",
      "・アクセス情報：IPアドレス、ブラウザの種類等（ホスティング・認証・広告・不正防止の各サービスが処理します。4・5を参照）",
      "生まれた年・性別は他のユーザーには公開されません。"
    ]
  },
  {
    h: "2. 利用目的",
    body: [
      "・アカウントの認証およびサービスの提供",
      "・リストの作成・公開・共有機能の提供",
      "・不正な登録・ログインの防止",
      "・広告の配信",
      "・サービスの改善および利用状況の把握（統計的に処理し、個人を特定しない形で利用します）"
    ]
  },
  {
    h: "3. 第三者提供",
    body: [
      "法令に基づく場合を除き、収集した個人情報を第三者に提供することはありません。ただし、4・5に記載する外部サービスへの情報送信があります。"
    ]
  },
  {
    h: "4. 外部サービスの利用",
    body: [
      "本サービスは以下の外部サービスを利用しています。",
      "・Supabase：データの保管・認証・アイコン画像の保管（https://supabase.com/privacy）",
      "・Netlify：サイトのホスティング（https://www.netlify.com/privacy/）",
      "・Cloudflare Turnstile：ログイン・新規登録・パスワード再設定時の不正防止（ボット判定）。判定のため、ブラウザや端末の情報がCloudflareに送信されます（https://www.cloudflare.com/turnstile-privacy-policy/）",
      "・Google AdSense：広告の配信（6を参照）",
      "・iTunes Search API / AniList / RAWG / MusicBrainz：楽曲・作品のジャケット画像や英語名等の取得（これらのAPIへユーザーの個人情報を送信することはありません）"
    ]
  },
  {
    h: "5. Cookie・localStorageの利用",
    body: [
      "本サービスは、ブラウザのlocalStorageに次の情報を保存します：ログイン状態、表示言語の設定、広告表示に関する設定。",
      "また、広告配信のため、Googleを含む第三者配信事業者がCookie等を使用します（6を参照）。Cookieはブラウザの設定で無効にできますが、その場合も本サービスは利用できます。"
    ]
  },
  {
    h: "6. 広告について",
    body: [
      "本サービスは、第三者配信の広告サービス「Google AdSense」を利用しています。",
      "Googleなどの第三者配信事業者は、Cookieを使用して、ユーザーが本サービスや他のウェブサイトに過去にアクセスした際の情報に基づいて広告を配信します。",
      "Googleが広告Cookieを使用することにより、ユーザーが本サービスや他のサイトにアクセスした際の情報に基づいて、Googleやそのパートナーが適切な広告を表示できます。",
      "ユーザーは、Googleの広告設定（https://adssettings.google.com/）でパーソナライズ広告を無効にできます。",
      "Googleによる情報の取り扱いについては「Googleのサービスを使用するサイトやアプリから収集した情報のGoogleによる使用」（https://policies.google.com/technologies/partner-sites）をご覧ください。",
      "欧州経済領域（EEA）・英国・スイスのユーザーには、Googleの認定同意管理プラットフォームによる同意の確認画面を表示します。"
    ]
  },
  {
    h: "7. データの削除",
    body: [
      "マイページの「アカウントを削除」から、アカウントおよび関連する全てのデータ（プロフィール・アイコン画像・リスト・いいね等）をいつでも完全に削除できます。"
    ]
  },
  {
    h: "8. ポリシーの改定",
    body: [
      "本ポリシーは必要に応じて改定されることがあります。重要な変更がある場合は、本サービス上でお知らせします。"
    ]
  },
  {
    h: "9. お問い合わせ",
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
      "- Profile: username, birth year, gender, bio, and icon image (the image file you upload)",
      "- Usage: song lists and anime lists you create, songs and titles you add, tags/notes, and likes",
      "- Access data: IP address, browser type, etc. (processed by our hosting, authentication, advertising and bot-protection providers; see sections 4 and 5)",
      "Your birth year and gender are never shown to other users."
    ]
  },
  {
    h: "2. How we use it",
    body: [
      "- Authentication and providing the Service",
      "- Creating, publishing and sharing lists",
      "- Preventing fraudulent sign-ups and logins",
      "- Serving ads",
      "- Service improvement and aggregated, non-identifying analytics"
    ]
  },
  {
    h: "3. Third-party disclosure",
    body: [
      "We do not share your personal information with third parties except where required by law. Some information is sent to the external services described in sections 4 and 5."
    ]
  },
  {
    h: "4. External services",
    body: [
      "The Service uses the following external services:",
      "- Supabase: data storage, authentication and icon image storage (https://supabase.com/privacy)",
      "- Netlify: site hosting (https://www.netlify.com/privacy/)",
      "- Cloudflare Turnstile: bot protection on log-in, sign-up and password reset. Browser and device information is sent to Cloudflare for this check (https://www.cloudflare.com/turnstile-privacy-policy/)",
      "- Google AdSense: serving ads (see section 6)",
      "- iTunes Search API / AniList / RAWG / MusicBrainz: fetching cover art, English titles and similar metadata (no personal information is sent to these APIs)"
    ]
  },
  {
    h: "5. Cookies and local storage",
    body: [
      "The Service stores the following in your browser's localStorage: your sign-in state, your language preference and your ad display settings.",
      "Third-party vendors, including Google, also use cookies to serve ads (see section 6). You can disable cookies in your browser settings and still use the Service."
    ]
  },
  {
    h: "6. Advertising",
    body: [
      "The Service uses Google AdSense, a third-party advertising service.",
      "Third-party vendors, including Google, use cookies to serve ads based on your prior visits to the Service or other websites.",
      "Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to the Service and/or other sites on the Internet.",
      "You may opt out of personalized advertising by visiting Google Ads Settings (https://adssettings.google.com/).",
      "For how Google uses this information, see \"How Google uses information from sites or apps that use our services\" (https://policies.google.com/technologies/partner-sites).",
      "Users in the European Economic Area, the UK and Switzerland are asked for consent through a Google-certified consent management platform."
    ]
  },
  {
    h: "7. Data deletion",
    body: [
      "You can permanently delete your account and all related data (profile, icon image, lists, likes, etc.) at any time from \"Delete account\" on your profile page."
    ]
  },
  {
    h: "8. Changes to this policy",
    body: [
      "This policy may be updated as needed. Significant changes will be announced on the Service."
    ]
  },
  {
    h: "9. Contact",
    body: [
      "For questions about this policy or the Service, please contact us at:",
      "Email: akasophia461@gmail.com"
    ]
  }
];

// 本文中の URL をリンクにする
const URL_RE = /(https:\/\/[^\s）)]+)/;

function Linkified({ text }) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} className={styles.link} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    )
  );
}

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
        {lang === "en"
          ? "Effective: July 4, 2026 / Last updated: October 19, 2026"
          : "制定日：2026年7月4日 / 最終改定日：2026年10月19日"}
      </p>

      {sections.map((s) => (
        <section key={s.h} className={styles.section}>
          <h2 className={styles.heading}>{s.h}</h2>
          {s.body.map((line, i) => (
            <p key={i} className={styles.text}><Linkified text={line} /></p>
          ))}
        </section>
      ))}
    </div>
  );
}
