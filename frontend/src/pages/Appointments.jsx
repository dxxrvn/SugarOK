import { useState, useEffect } from "react";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../api";
import { toDateString, formatDate, makeCalendarLink } from "../utils";

function sortByDate(list) {
  return list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [doctor, setDoctor] = useState("");
  const [date, setDate] = useState(toDateString(new Date()));
  const [time, setTime] = useState("10:00");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    async function loadAppointments() {
      try {
        const data = await getAppointments();
        setAppointments(sortByDate(data));
      } catch (err) {
        setError("Не удалось загрузить записи. Проверьте, что сервер запущен.");
      }
      setLoading(false);
    }
    loadAppointments();
  }, []);

  function resetForm() {
    setDoctor("");
    setDate(toDateString(new Date()));
    setTime("10:00");
    setPlace("");
    setNote("");
    setEditId(null);
  }

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (doctor.trim() === "") {
      setError("Укажите врача или специальность");
      return;
    }
    if (date === "" || time === "") {
      setError("Укажите дату и время");
      return;
    }

    const data = {
      doctor: doctor.trim(),
      date: date,
      time: time,
      place: place.trim(),
      note: note.trim(),
    };

    if (saving) return;
    setSaving(true);

    try {
      if (editId) {
        await updateAppointment(editId, data);
        const newList = appointments.map((item) => {
          if (item.id === editId) {
            return {
              id: editId,
              doctor: data.doctor,
              date: data.date,
              time: data.time,
              place: data.place,
              note: data.note,
            };
          }
          return item;
        });
        setAppointments(sortByDate(newList));
      } else {
        const { id } = await createAppointment(data);
        setAppointments(sortByDate([...appointments, { id, ...data }]));
      }
      setError("");
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item) {
    setDoctor(item.doctor);
    setDate(item.date);
    setTime(item.time);
    setPlace(item.place || "");
    setNote(item.note || "");
    setEditId(item.id);
    setError("");
    window.scrollTo(0, 0);
  }

  async function handleDelete(id) {
    if (!window.confirm("Удалить эту запись?")) return;
    try {
      await deleteAppointment(id);
      setAppointments(appointments.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const now =
    toDateString(new Date()) + " " + new Date().toTimeString().slice(0, 5);

  return (
    <div>
      <h1 className="page-title">Записи к врачу</h1>
      <p className="page-subtitle">Ближайшие приёмы и анализы</p>
      {error && <div className="error-box">{error}</div>}
      <div className="two-columns">
        <div className="card">
          <h2>{editId ? "Изменить запись" : "Новая запись"}</h2>
          <div
            className="form"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.tagName === "INPUT")
                handleSave();
            }}
          >
            <label>Врач или специальность</label>
            <input
              className="input"
              type="text"
              placeholder="Эндокринолог"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
            />
            <div className="row-2">
              <div>
                <label>Дата</label>
                <input
                  className="input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label>Время</label>
                <input
                  className="input"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            <label>Место (необязательно)</label>
            <input
              className="input"
              type="text"
              placeholder="Поликлиника, кабинет 204"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
            <label>Заметка (необязательно)</label>
            <textarea
              className="input"
              placeholder="Взять результаты анализов"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="buttons-row">
              <button className="btn btn-red" onClick={handleSave}>
                {editId ? "Сохранить" : "Добавить"}
              </button>
              {editId && (
                <button className="btn btn-pink" onClick={resetForm}>
                  Отмена
                </button>
              )}
            </div>
          </div>
        </div>
        <div>
          <h2>Мои записи</h2>
          {loading && <p className="empty">Загрузка...</p>}
          {!loading && appointments.length === 0 && (
            <p className="empty">Записей пока нет. Добавьте первую!</p>
          )}

          {appointments.map((item) => {
            const isPast = item.date + " " + item.time < now;

            return (
              <div
                key={item.id}
                className={
                  isPast ? "diary-card item-card past" : "diary-card item-card"
                }
              >
                <div className="diary-time">{item.time}</div>
                <div className="diary-info">
                  <b>{item.doctor}</b>
                  <div className="gray">
                    {formatDate(item.date)}
                    {item.place && " · " + item.place}
                    {isPast && " · прошло"}
                  </div>
                  {item.note && <div className="diary-note">{item.note}</div>}
                </div>
                <a
                  className="calendar-link"
                  target="_blank"
                  rel="noreferrer"
                  href={makeCalendarLink(
                    "Приём: " + item.doctor,
                    item.date,
                    item.time,
                    60,
                    (item.place ? "Место: " + item.place + ". " : "") +
                      (item.note || ""),
                    false,
                  )}
                >
                  В календарь
                </a>
                <button
                  className="icon-btn"
                  title="Изменить"
                  onClick={() => handleEdit(item)}
                >
                  ✏️
                </button>
                <button
                  className="icon-btn"
                  title="Удалить"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleDelete(item.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
