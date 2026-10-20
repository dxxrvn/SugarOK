import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMeasurements, deleteMeasurement } from "../api";
import { useAuth } from "../auth";
import {
  toDateString,
  formatDate,
  formatGlucose,
  mealText,
  feelingText,
  formatBirthDate,
  getAge,
  genderText,
  diabetesText,
} from "../utils";

function getDates(days) {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - (days - 1));
  return { from: toDateString(start), to: toDateString(today) };
}

export default function Diary() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState("week");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { user } = useAuth();

  const dates = getDates(period === "week" ? 7 : 30);

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      try {
        const range = getDates(period === "week" ? 7 : 30);
        const data = await getMeasurements(range.from, range.to);
        setRecords(data);
        setError("");
      } catch (err) {
        setError("Не удалось загрузить записи. Проверьте, что сервер запущен.");
      }
      setLoading(false);
    }
    loadRecords();
  }, [period]);

  async function handleDelete(id) {
    if (!window.confirm("Удалить эту запись?")) return;
    try {
      await deleteMeasurement(id);

      setRecords(records.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleReport() {
    window.print();
  }

  return (
    <div>
      <div className="print-only">
        <h1>Отчёт для врача — СахарОК</h1>
        {user && (
          <p>
            Пациент: {user.fullName}. Дата рождения:{" "}
            {formatBirthDate(user.birthDate)}, возраст: {getAge(user.birthDate)}
            . Пол: {genderText(user.gender)}. Диагноз:{" "}
            {diabetesText(user.diabetesType)}.
          </p>
        )}
        <p>
          Период: {formatDate(dates.from)} — {formatDate(dates.to)}. Записей:{" "}
          {records.length}
        </p>
      </div>
      <h1 className="page-title no-print">Мой дневник</h1>
      <p className="page-subtitle no-print">Записи за выбранный период</p>
      {error && <div className="error-box no-print">{error}</div>}
      <div className="diary-top no-print">
        <div className="toggle small">
          <button
            className={period === "week" ? "active" : ""}
            onClick={() => setPeriod("week")}
          >
            Неделя
          </button>
          <button
            className={period === "month" ? "active" : ""}
            onClick={() => setPeriod("month")}
          >
            Месяц
          </button>
        </div>
        <button
          className="btn btn-red btn-auto"
          onClick={() => navigate("/add")}
        >
          Добавить запись
        </button>
        <button className="btn btn-pink btn-auto" onClick={handleReport}>
          Отчёт для врача
        </button>
      </div>
      {loading && <p className="empty">Загрузка...</p>}

      {!loading && records.length === 0 && !error && (
        <div className="empty">Записей за этот период пока нет</div>
      )}

      {records.map((item, index) => (
        <div key={item.id}>
          {(index === 0 || records[index - 1].date !== item.date) && (
            <div className="day-title">{formatDate(item.date)}</div>
          )}
          <div className="diary-card">
            <div className="diary-time">{item.time}</div>
            <div className="diary-info">
              <b>{formatGlucose(item.glucose)} ммоль/л</b>
              <div className="gray">
                {mealText(item.meal)} · {feelingText(item.feeling)}
              </div>
              {item.note && <div className="diary-note">{item.note}</div>}
            </div>
            <button
              className="icon-btn no-print"
              title="Изменить"
              onClick={() => navigate("/edit/" + item.id)}
            >
              ✏️
            </button>
            <button
              className="icon-btn no-print"
              title="Удалить"
              onClick={(e) => {
                e.currentTarget.blur();
                handleDelete(item.id);
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
