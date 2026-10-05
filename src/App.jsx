import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TransitionProvider } from './transition';
import { useAuth } from './auth';
import Home from './pages/Home';
import About from './pages/About';
import Cars from './pages/Cars';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

function RequireAccount({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <div className="boot">Loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

export default function App() {
  const location = useLocation();
  return (
    <TransitionProvider>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/cars" element={<RequireAccount><Cars /></RequireAccount>} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TransitionProvider>
  );
}
