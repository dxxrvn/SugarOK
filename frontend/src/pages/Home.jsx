import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLatest, getMeasurements } from "../api";
import {
  toDateString,
  formatDate,
  formatGlucose,
  mealText,
  feelingText,
} from "../utils";

const MIN_NORM = 3.9;
const MAX_NORM = 7.8;

function Chart({ records }) {
  const width = 600;
  const height = 170;
  const left = 28;
  const bottom = 22;
  const highest = Math.max(...records.map((r) => r.glucose));
  const maxValue = highest > 12 ? Math.ceil(highest) + 1 : 12;

  if (records.length === 0) {
    return <p className="empty">За эту неделю записей пока нет</p>;
  }

  const step =
    records.length > 1 ? (width - left - 10) / (records.length - 1) : 0;
  const points = records.map((item, index) => {
    return {
      x: left + index * step,
      y: (height - bottom) * (1 - item.glucose / maxValue),
    };
  });

  const line = points.map((p) => p.x + "," + p.y).join(" ");
  const last = points[points.length - 1];
  const lastRecord = records[records.length - 1];

  return (
    <svg className="chart" viewBox={"0 0 " + width + " " + height}>
      {[0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48]
        .filter((n) => n <= maxValue)
        .map((n) => {
          const y = (height - bottom) * (1 - n / maxValue);
          return (
            <g key={n}>
              <line className="grid-line" x1={left} x2={width} y1={y} y2={y} />
              <text x="0" y={y + 4}>
                {n}
              </text>
            </g>
          );
        })}
      <polyline className="line" points={line} />
      {points.map((p, i) => (
        <circle key={i} className="dot" cx={p.x} cy={p.y} r="4" />
      ))}
      <text className="last-label" x={last.x - 10} y={last.y - 10}>
        {formatGlucose(lastRecord.glucose)}
      </text>
      <text x={left} y={height - 4}>
        {formatDate(records[0].date)}
      </text>
      <text x={width - 60} y={height - 4}>
        {formatDate(lastRecord.date)}
      </text>
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const [latest, setLatest] = useState(null);
  const [week, setWeek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 6);

        setLatest(await getLatest());
        setWeek(
          await getMeasurements(toDateString(weekAgo), toDateString(today)),
        );
      } catch (err) {
        setError("Не удалось загрузить данные. Проверьте, что сервер запущен.");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return <p className="empty">Загрузка...</p>;
  }

  const forChart = [...week].reverse();
  const recent = week.slice(0, 3);

  let statusText = "В вашем диапазоне";
  let statusClass = "status good";
  let mascotSrc = "/sugar_normal.png";

  if (latest && latest.glucose < MIN_NORM) {
    statusText = "Ниже нормы";
    statusClass = "status bad";
    mascotSrc = "/sugar_low.png";
  }
  if (latest && latest.glucose > MAX_NORM) {
    statusText = "Выше нормы";
    statusClass = "status bad";
    mascotSrc = "/sugar_high.png";
  }

  return (
    <div>
      <h1 className="page-title">Главная</h1>
      <p className="page-subtitle">Как вы сегодня?</p>
      {error && <div className="error-box">{error}</div>}
      <div className="home-layout">
        <div className="home-left">
          <div className="card glucose-card">
            {latest ? (
              <div>
                <div className={statusClass}>{statusText}</div>
                <div className="glucose-big">
                  {formatGlucose(latest.glucose)}
                </div>
                <div className="glucose-unit">ммоль/л</div>
                <div className="gray">
                  {formatDate(latest.date)}, {latest.time}
                </div>
              </div>
            ) : (
              <div>
                <div className="glucose-unit">Последняя запись</div>
                <p className="gray">
                  Записей пока нет. Добавьте первое измерение!
                </p>
              </div>
            )}
            <img
              className="mascot-img mascot-md"
              src={mascotSrc}
              alt="Сахарок"
            />
          </div>
          <button
            className="btn btn-red add-mobile"
            onClick={() => navigate("/add")}
          >
            + Добавить запись
          </button>
          <div className="card">
            <div className="chart-head">
              <h2>Глюкоза за неделю</h2>
              <span className="gray">{week.length} записей</span>
            </div>
            <Chart records={forChart} />
          </div>
          <div>
            <h2>Последние записи</h2>
            {recent.length === 0 && <p className="empty">Пока пусто</p>}
            {recent.map((item) => (
              <div
                key={item.id}
                className="record-row"
                onClick={() => navigate("/diary")}
              >
                <span className="hide-mobile">{formatDate(item.date)}</span>
                <span>{item.time}</span>
                <b>{formatGlucose(item.glucose)} ммоль/л</b>
                <span className="hide-mobile">
                  {mealText(item.meal)} · {feelingText(item.feeling)}
                </span>
                <span className="arrow">›</span>
              </div>
            ))}
          </div>
        </div>
        <div className="home-right">
          <div className="card today-card">
            <h2>Сегодня</h2>
            <p className="gray">Все важные записи под рукой</p>
            <div className="date-big">
              {new Date().toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
              })}
            </div>
            <button className="btn btn-red" onClick={() => navigate("/add")}>
              Добавить запись
            </button>
          </div>
          <div className="card">
            <h2>Данные для врача</h2>
            <p className="gray" style={{ marginBottom: 12 }}>
              Соберите записи за период в один отчёт.
            </p>
            <button className="btn btn-pink" onClick={() => navigate("/diary")}>
              Подготовить отчёт
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
