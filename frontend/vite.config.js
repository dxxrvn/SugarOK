import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const baseHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' http://localhost:3000",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export default defineConfig({
  plugins: [react()],
  server: { headers: baseHeaders }, // npm run dev
  preview: { headers: { ...baseHeaders, "Content-Security-Policy": csp } }, // npm run preview
});
