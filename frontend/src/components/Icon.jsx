export default function Icon({ name }) {
  let shapes = null;

  if (name === "home") {
    shapes = (
      <g>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M10 20v-5h4v5" />
      </g>
    );
  }

  if (name === "diary") {
    shapes = (
      <g>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </g>
    );
  }

  if (name === "pill") {
    shapes = (
      <g transform="rotate(-45 12 12)">
        <rect x="2" y="8" width="20" height="8" rx="4" />
        <path d="M12 8v8" />
      </g>
    );
  }

  if (name === "doctor") {
    shapes = (
      <g>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <path d="M12 13v5M9.5 15.5h5" />
      </g>
    );
  }

  if (name === "profile") {
    shapes = (
      <g>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </g>
    );
  }

  if (name === "info") {
    shapes = (
      <g>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7.5v.01" />
      </g>
    );
  }

  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes}
    </svg>
  );
}
