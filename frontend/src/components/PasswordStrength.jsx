import { useEffect, useMemo, useState } from "react";

export const MIN_SCORE = 3;

const LEVELS = [
  { text: "Очень слабый" },
  { text: "Слабый" },
  { text: "Средний" },
  { text: "Хороший" },
  { text: "Отличный" },
];

let zxcvbnPromise = null;
function loadZxcvbn() {
  if (!zxcvbnPromise) {
    zxcvbnPromise = import("zxcvbn")
      .then((module) => module.default || module)
      .catch((err) => {
        zxcvbnPromise = null;
        throw err;
      });
  }
  return zxcvbnPromise;
}

export function usePasswordScore(password, extraWords = []) {
  const [checker, setChecker] = useState(null);
  const [failed, setFailed] = useState(false);
  const hasPassword = password.length > 0;

  useEffect(() => {
    if (!hasPassword || checker) return;
    let cancelled = false;
    loadZxcvbn()
      .then((fn) => {
        if (!cancelled) setChecker(() => fn);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasPassword, checker]);

  const wordsKey = extraWords.join("|");

  const score = useMemo(() => {
    if (!checker || !hasPassword) return null;
    const words = wordsKey ? wordsKey.split("|").filter(Boolean) : [];

    return checker(password.slice(0, 100), words).score;
  }, [checker, password, hasPassword, wordsKey]);

  return {
    score,
    loading: hasPassword && !checker && !failed,
    failed,
  };
}

function hintText(score) {
  if (score === null) return "";
  if (score < MIN_SCORE) return "Добавьте длины, необычные слова, цифры или символы";
  if (score === MIN_SCORE) return "Подойдёт. Можно ещё надёжнее";
  return "Отличный пароль!";
}

export default function PasswordStrength({ score, loading }) {
  const filled = score === null ? 0 : (score + 1) * 20;
  const level = score === null ? "empty" : score;

  let label = "Придумайте надёжный пароль";
  let hint = "";
  if (loading) {
    label = "Проверяем пароль…";
  } else if (score !== null) {
    label = LEVELS[score].text;
    hint = hintText(score);
  }

  return (
    <div className="pw-meter" aria-live="polite">
      <div
        className="pw-track"
        role="progressbar"
        aria-label="Надёжность пароля"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score === null ? 0 : score}
        aria-valuetext={label}
      >
        <div className={"pw-fill pw-level-" + level} style={{ width: filled + "%" }} />
      </div>
      <div className="pw-info">
        <span className={"pw-label pw-text-" + level}>{label}</span>
        {hint && <span className="pw-hint">{hint}</span>}
      </div>
    </div>
  );
}
