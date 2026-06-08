import { Link, useNavigate } from "react-router-dom";


export default function Header({ isLoggedIn, updateLoginState }) {
  const navigate = useNavigate();

  const handleIconClick = () => {
    if (isLoggedIn) {
      navigate("/mypage");
    } else {
      navigate("/login");
    }
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 20px",
        borderBottom: "1px solid #ddd",
      }}
    >
      <Link to="/" style={{ textDecoration: "none", color: "black" }}>
        <h1 style={{ margin: 0, fontSize: "20px" }}>AnisonList</h1>
      </Link>

      <span
        onClick={handleIconClick}
        style={{
          fontSize: "24px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {isLoggedIn ? "👤" : "❔"}
      </span>
    </header>
  );
}
