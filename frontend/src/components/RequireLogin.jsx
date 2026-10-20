import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function RequireLogin() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="empty">Загрузка...</p>;
  }

  if (!user) {
    return (
      <div className="card need-login">
        <img className="mascot-img mascot-md need-login-mascot" src="/mascot.png" alt="" />
        <h2>Войдите, чтобы вести дневник</h2>
        <p className="gray" style={{ marginBottom: 16 }}>
          Ваши записи сохраняются в личном аккаунте.
        </p>
        <Link to="/profile" className="btn btn-red">
          Регистрация / Вход
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
