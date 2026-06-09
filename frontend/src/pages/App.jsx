import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

import Header from "../components/parts/Header";
import Layout from "./Layout";

import Home from "./Home";
import SongDetail from "./SongDetail/SongDetail";
import Login from "./auth/Login";
import Register from "./auth/Register";
import MyPage from "./Mypage/MyPage";
import ListPage from "./ListPage/ListPage";
import ForgotPassword from "./auth/ForgotPassword";
import AnimeDetail from "./AnimeDetail/AnimeDetail";
import ArtistDetail from "./ArtistDetail/ArtistDetail";

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
    <BrowserRouter>
      <Header isLoggedIn={isLoggedIn} updateLoginState={updateLoginState} />

      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/songs/:id" element={<SongDetail />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
