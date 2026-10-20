import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RequireLogin from "./components/RequireLogin";
import Home from "./pages/Home";
import Diary from "./pages/Diary";
import AddRecord from "./pages/AddRecord";
import Medications from "./pages/Medications";
import Appointments from "./pages/Appointments";
import Profile from "./pages/Profile";
import About from "./pages/About";
import { AuthProvider } from "./auth";
import "./styles.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="*"
              element={<p className="empty">Страница не найдена</p>}
            />
            <Route element={<RequireLogin />}>
              <Route path="/" element={<Home />} />
              <Route path="/add" element={<AddRecord />} />
              <Route path="/edit/:id" element={<AddRecord />} />
              <Route path="/diary" element={<Diary />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/appointments" element={<Appointments />} />
            </Route>
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
