import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TLink, useGo } from '../transition';
import { useAuth } from '../auth';

const LINKS = [
  ['Home', '/'],
  ['About', '/about'],
  ['Contact', '/contact'],
];

export default function Navbar({ home = false }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const go = useGo();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const links = user
    ? [LINKS[0], LINKS[1], ['Cars', '/cars'], LINKS[2]]
    : LINKS;

  const isAdmin = user?.role === 'admin';
  const cta = home
    ? { label: user ? 'Browse parts' : 'Sign in to browse parts', to: user ? '/cars' : '/login' }
    : user
      ? { label: isAdmin ? 'Dashboard' : 'My account', to: '/dashboard' }
      : { label: 'Sign in', to: '/login' };
  const accountLinks = isAdmin
    ? [['Cars & parts', '/cars'], ['Admin dashboard', '/dashboard']]
    : user
      ? [['Browse parts', '/cars'], ['My account', '/dashboard']]
      : [['Sign in', '/login'], ['Create account', '/register']];

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    setOpen(false);
    setLoggingOut(false);
    go('/');
  };

  return (
    <>
      <motion.nav
        className={'nav' + (home ? ' nav-home' : '')}
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        <div className="nav-left">
          <button className="nav-burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span /><span />
          </button>
          <div className="nav-links">
            {links.map(([label, to]) => (
              <TLink key={to} to={to} className={'nav-link' + (pathname === to ? ' is-active' : '')}>{label}</TLink>
            ))}
          </div>
        </div>
        <TLink to="/" className="logo">VELORA</TLink>
        <div className="nav-right">
          <TLink to={cta.to} className="btn-nav">
            {cta.label} <span className="arrow">→</span>
          </TLink>
          {user && (
            <button className="nav-logout" type="button" onClick={handleLogout} disabled={loggingOut} aria-label="Log out of your account">
              {loggingOut ? 'Signing out…' : 'Log out'}
            </button>
          )}
        </div>
      </motion.nav>
      <AnimatePresence>
        {open && (
          <motion.div className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {[...links, ...accountLinks].map(([label, to], i) => (
              <motion.div key={`${label}-${to}`} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i + 0.05 }}>
                <TLink to={to} className="mobile-link" onClick={() => setOpen(false)}>{label}</TLink>
              </motion.div>
            ))}
            {user && (
              <motion.div key="logout" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * (links.length + accountLinks.length) + 0.05 }}>
                <button className="mobile-link mobile-logout" type="button" onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? 'Signing out…' : 'Log out'}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
