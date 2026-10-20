const API_URL = "http://localhost:3000/api";

let accessToken = null;
let refreshPromise = null;

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function errorText(response, data, fallback) {
  if (data && data.error) return data.error;
  if (response.status === 429) return "Слишком много попыток, подождите";
  if (response.status === 409) return "Логин занят";
  if (response.status === 401) return "Неверный логин или пароль";
  if (response.status === 400) return "Проверьте введённые данные";
  return fallback || "Что-то пошло не так, попробуйте позже";
}

async function sendAuth(path, body) {
  const response = await fetch(API_URL + path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await readJson(response);
  if (!response.ok) throw new Error(errorText(response, result));
  accessToken = result.accessToken;
  return result.user;
}

export function registerUser(data) {
  return sendAuth("/auth/register", data);
}

export function loginUser(login, password) {
  return sendAuth("/auth/login", { login: login, password: password });
}

export async function logout() {
  await fetch(API_URL + "/auth/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
  accessToken = null;
}

async function requestNewTokens() {
  try {
    const response = await fetch(API_URL + "/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = await response.json();
    accessToken = data.accessToken;
    return data.user;
  } catch {
    return null;
  }
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = requestNewTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function forceLogout() {
  accessToken = null;
  window.location.href = "/profile";
}

async function apiFetch(path, options = {}) {
  function send() {
    return fetch(API_URL + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
        "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  }

  const response = await send();
  if (response.status !== 401) return response;

  const user = await refreshSession();
  if (!user) {
    forceLogout();
    return response;
  }
  return send();
}

export async function getLatest() {
  const response = await apiFetch("/measurements/latest");
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Не удалось загрузить данные");
  return await response.json();
}

export async function getMeasurements(from, to) {
  const response = await apiFetch("/measurements?from=" + from + "&to=" + to);
  if (!response.ok) throw new Error("Не удалось загрузить записи");
  return await response.json();
}

export async function getMeasurement(id) {
  const response = await apiFetch("/measurements/" + id);
  if (!response.ok) throw new Error("Запись не найдена");
  return await response.json();
}

export async function createMeasurement(data) {
  const response = await apiFetch("/measurements", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await readJson(response);
  if (!response.ok) throw new Error(errorText(response, result));
  return result;
}

export async function updateMeasurement(id, data) {
  const response = await apiFetch("/measurements/" + id, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const result = await readJson(response);
  if (!response.ok) throw new Error(errorText(response, result));
  return result;
}

export async function deleteMeasurement(id) {
  const response = await apiFetch("/measurements/" + id, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Не удалось удалить запись");
}

export async function getMedications() {
  const response = await apiFetch("/medications");
  if (!response.ok) throw new Error("Не удалось загрузить лекарства");
  return await response.json();
}

export async function createMedication(data) {
  const response = await apiFetch("/medications", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await readJson(response);
  if (!response.ok) throw new Error(errorText(response, result));
  return result;
}

export async function updateMedication(id, data) {
  const response = await apiFetch("/medications/" + id, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const result = await readJson(response);
  if (!response.ok) throw new Error(errorText(response, result));
  return result;
}

export async function deleteMedication(id) {
  const response = await apiFetch("/medications/" + id, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Не удалось удалить лекарство");
}

export async function getAppointments() {
  const response = await apiFetch("/appointments");
  if (!response.ok) throw new Error("Не удалось загрузить записи");
  return await response.json();
}

export async function createAppointment(data) {
  const response = await apiFetch("/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await readJson(response);
  if (!response.ok) throw new Error(errorText(response, result));
  return result;
}

export async function updateAppointment(id, data) {
  const response = await apiFetch("/appointments/" + id, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  const result = await readJson(response);
  if (!response.ok) throw new Error(errorText(response, result));
  return result;
}

export async function deleteAppointment(id) {
  const response = await apiFetch("/appointments/" + id, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Не удалось удалить запись");
}
