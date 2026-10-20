import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import Icon from "./Icon";
import { useAuth } from "../auth";

function getToday() {
  const text = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return text[0].toUpperCase() + text.slice(1);
}

const links = [
  { to: "/", icon: "home", text: "Главная" },
  { to: "/diary", icon: "diary", text: "Дневник" },
  { to: "/medications", icon: "pill", text: "Лекарства" },
  { to: "/appointments", icon: "doctor", text: "Врачи" },
  { to: "/profile", icon: "profile", text: "Профиль" },
];

function Menu() {
  return links.map((item) => (
    <NavLink key={item.to} to={item.to} end className="nav-link">
      <Icon name={item.icon} />
      <span>{item.text}</span>
    </NavLink>
  ));
}

export default function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  let firstName = "";
  if (user) {
    const words = user.fullName.split(" ");
    firstName = words[1] || words[0];
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <Link to="/about" title="О проекте" style={{ display: "inline-block" }}>
          <img className="logo" src="/logo.png" alt="СахарОК" />
        </Link>
        <Menu />
        <Link to="/about" className="sidebar-bottom" style={{ textDecoration: "none", color: "inherit" }}>
          <img className="mascot-img mascot-md" src="/sugar_normal.png" alt="Сахарок" />
          <b>СахарОК</b>
          <span className="gray">Ваш дневник самоконтроля</span>
        </Link>
      </aside>
      <main className="main">
        <div className="mobile-header">
          <Link to="/about" title="О проекте">
            <img src="/logo.png" alt="СахарОК" />
          </Link>
          <Link to="/profile" className="profile-btn">
            {user ? firstName[0] : <Icon name="profile" />}
          </Link>
        </div>
        <div className="topbar">
          <span>{getToday()}</span>
          {!loading && (user ? (
            <Link to="/profile" className="topbar-user">{firstName}</Link>
          ) : (
            <Link to="/profile" className="auth-link">Регистрация / Вход</Link>
          ))}
        </div>
        <div className="page" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <nav className="bottom-nav">
        <Menu />
      </nav>
    </div>
  );
}
