import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import PasswordStrength, {
  usePasswordScore,
  MIN_SCORE,
} from "../components/PasswordStrength";
import {
  toDateString,
  formatBirthDate,
  getAge,
  genderText,
  DIABETES_TYPES,
  diabetesText,
} from "../utils";

export default function Profile() {
  const {
    user,
    loading: authLoading,
    login: signIn,
    register,
    logout,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("register");
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [diabetesType, setDiabetesType] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const nameWords = fullName
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  const {
    score,
    loading: scoreLoading,
    failed: scoreFailed,
  } = usePasswordScore(mode === "register" ? password : "", [
    login.trim(),
    ...nameWords,
  ]);

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
  }

  function showError(err) {
    if (err.message === "Failed to fetch") {
      setError("Нет связи с сервером");
    } else {
      setError(err.message);
    }
  }

  const [saving, setSaving] = useState(false);

  async function handleRegister() {
    if (fullName.trim() === "") {
      setError("Введите ФИО");
      return;
    }
    if (birthDate === "" || birthDate > toDateString(new Date())) {
      setError("Укажите корректную дату рождения");
      return;
    }
    if (gender === "") {
      setError("Выберите пол");
      return;
    }
    if (diabetesType === "") {
      setError("Выберите тип диабета");
      return;
    }
    if (login.trim().length < 3) {
      setError("Логин должен быть не короче 3 символов");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }

    if (scoreLoading) {
      setError("Проверяем надёжность пароля, секунду…");
      return;
    }
    if (!scoreFailed && (score === null || score < MIN_SCORE)) {
      setError(
        "Слишком простой пароль. Добавьте длины, необычные слова, цифры или символы",
      );
      return;
    }
    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      await register({
        fullName: fullName.trim(),
        birthDate: birthDate,
        gender: gender,
        diabetesType: diabetesType,
        login: login.trim(),
        password: password,
      });
      navigate("/");
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogin() {
    if (login.trim() === "" || password === "") {
      setError("Введите логин и пароль");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      await signIn(login.trim(), password);
      navigate("/");
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
  }

  if (authLoading) return null;

  if (user) {
    return (
      <div>
        <h1 className="page-title">Профиль</h1>
        <p className="page-subtitle">Личные данные</p>
        <div className="card profile-card">
          <img
            className="mascot-img mascot-md profile-mascot"
            src="/mascot.png"
            alt=""
          />
          <div className="profile-row">
            <span className="gray">ФИО</span>
            <b>{user.fullName}</b>
          </div>
          <div className="profile-row">
            <span className="gray">Логин</span>
            <b>{user.login}</b>
          </div>
          {user.birthDate && (
            <div className="profile-row">
              <span className="gray">Дата рождения</span>
              <b>
                {formatBirthDate(user.birthDate)} ({getAge(user.birthDate)})
              </b>
            </div>
          )}
          {user.gender && (
            <div className="profile-row">
              <span className="gray">Пол</span>
              <b>{genderText(user.gender)}</b>
            </div>
          )}
          {user.diabetesType && (
            <div className="profile-row">
              <span className="gray">Тип диабета</span>
              <b>{diabetesText(user.diabetesType)}</b>
            </div>
          )}
          <button
            className="btn btn-pink"
            style={{ marginTop: 18 }}
            onClick={handleLogout}
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">
        {mode === "register" ? "Регистрация" : "Вход"}
      </h1>
      <p className="page-subtitle">
        {mode === "register"
          ? "Создайте аккаунт, чтобы вести дневник"
          : "Войдите в свой аккаунт"}
      </p>
      <div className="card profile-card">
        <div className="toggle">
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => switchMode("register")}
          >
            Регистрация
          </button>
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => switchMode("login")}
          >
            Вход
          </button>
        </div>
        {error && (
          <div className="error-box" style={{ marginTop: 14 }}>
            {error}
          </div>
        )}
        <div
          className="form"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName === "INPUT") {
              mode === "register" ? handleRegister() : handleLogin();
            }
          }}
        >
          {mode === "register" && (
            <div className="form-part">
              <label>ФИО</label>
              <input
                className="input"
                type="text"
                placeholder="Иванов Алексей Петрович"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <label>Дата рождения</label>
              <input
                className="input"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
              <label>Пол</label>
              <div className="toggle">
                <button
                  className={gender === "male" ? "active" : ""}
                  onClick={() => setGender("male")}
                >
                  Мужской
                </button>
                <button
                  className={gender === "female" ? "active" : ""}
                  onClick={() => setGender("female")}
                >
                  Женский
                </button>
              </div>
              <label>Тип сахарного диабета</label>
              <select
                className="input"
                value={diabetesType}
                onChange={(e) => setDiabetesType(e.target.value)}
              >
                <option value="">Выберите тип</option>
                {DIABETES_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.text}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label>Логин</label>
          <input
            className="input"
            type="text"
            placeholder="alexey"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <label>Пароль</label>
          <input
            className="input"
            type="password"
            placeholder={
              mode === "register" ? "Придумайте пароль" : "Ваш пароль"
            }
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "register" && (
            <PasswordStrength score={score} loading={scoreLoading} />
          )}

          {mode === "register" && (
            <div className="form-part">
              <label>Повторите пароль</label>
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </div>
          )}
          <button
            className="btn btn-red"
            style={{ marginTop: 18 }}
            onClick={mode === "register" ? handleRegister : handleLogin}
          >
            {mode === "register" ? "Зарегистрироваться" : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}
