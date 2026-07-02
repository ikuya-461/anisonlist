import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "../lib/supabaseClient";

import Header from "../components/ui/Header";
import Layout from "./Layout";
import { LanguageProvider } from "../contexts/LanguageContext";
import { DetailSkeleton } from "../components/ui/Skeleton";

// Home はランディングページなので即時バンドル、それ以外はルート単位で遅延読み込み
// （初回訪問者の大半が見るのはHomeなので、そこだけ分割しても得しない）
import Home from "./Home";
const SongDetail = lazy(() => import("./SongDetail/SongDetail"));
const Login = lazy(() => import("./auth/Login"));
const Register = lazy(() => import("./auth/Register"));
const MyPage = lazy(() => import("./Mypage/MyPage"));
const ListPage = lazy(() => import("./ListPage/ListPage"));
const ForgotPassword = lazy(() => import("./auth/ForgotPassword"));
const AnimeDetail = lazy(() => import("./AnimeDetail/AnimeDetail"));
const GameDetail = lazy(() => import("./GameDetail/GameDetail"));
const ArtistDetail = lazy(() => import("./ArtistDetail/ArtistDetail"));
const PublicListPage = lazy(() => import("./PublicListPage/PublicListPage"));
const PublicProfilePage = lazy(() => import("./PublicProfilePage/PublicProfilePage"));

function App() {
  // null = 初期確認中（ローディング扱い）、true/false = 確認済み
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  const updateLoginState = async () => {
    const { data } = await supabase.auth.getUser();
    setIsLoggedIn(!!data.user);
  };

  useEffect(() => {
    updateLoginState();

    // セッション変化（ログイン／ログアウト）を自動反映
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      updateLoginState();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (isLoggedIn === null) return null;

  return (
    <LanguageProvider>
    <BrowserRouter>
      <Header isLoggedIn={isLoggedIn} updateLoginState={updateLoginState} />

      <Layout>
        <Suspense fallback={<div style={{ padding: "40px 20px" }}><DetailSkeleton /></div>}>
          <Routes>
            <Route path="/" element={<Home isLoggedIn={isLoggedIn} />} />
            <Route path="/songs/:id" element={<SongDetail />} />
            <Route path="/anime/:id" element={<AnimeDetail />} />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/artist/:id" element={<ArtistDetail />} />

            <Route
              path="/login"
              element={<Login updateLoginState={updateLoginState} />}
            />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route
              path="/mypage"
              element={<MyPage updateLoginState={updateLoginState} />}
            />

            <Route path="/list/:id" element={<ListPage />} />
            <Route path="/public/:id" element={<PublicListPage />} />
            <Route path="/user/:userId" element={<PublicProfilePage />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
