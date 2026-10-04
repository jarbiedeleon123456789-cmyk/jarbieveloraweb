import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TLink } from '../transition';
import { useAuth } from '../auth';

const LINKS = [
  ['Home', '/'],
  ['About', '/about'],
  ['Cars', '/cars'],
  ['Contact', '/contact'],
];

export default function Navbar({ home = false }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const cta = home
    ? { label: 'Browse cars', to: '/cars' }
    : user
      ? { label: 'Dashboard', to: '/dashboard' }
      : { label: 'Admin login', to: '/login' };

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
            {LINKS.map(([label, to]) => (
              <TLink key={to} to={to} className={'nav-link' + (pathname === to ? ' is-active' : '')}>{label}</TLink>
            ))}
          </div>
        </div>
        <TLink to="/" className="logo">VELORA</TLink>
        <div className="nav-right">
          <TLink to={cta.to} className="btn-nav">
            {cta.label} <span className="arrow">→</span>
          </TLink>
        </div>
      </motion.nav>
      <AnimatePresence>
        {open && (
          <motion.div className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {[...LINKS, ...(user ? [['Dashboard', '/dashboard']] : [['Admin login', '/login']])].map(([label, to], i) => (
              <motion.div key={to} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i + 0.05 }}>
                <TLink to={to} className="mobile-link" onClick={() => setOpen(false)}>{label}</TLink>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
