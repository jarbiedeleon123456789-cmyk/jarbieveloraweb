import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Ctx = createContext({ go: () => {} });
export const useGo = () => useContext(Ctx).go;

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Page-to-page curtain: cover the screen, swap the route underneath, then lift away. */
export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('idle'); // idle | cover | reveal
  const busy = useRef(false);

  const go = useCallback((to) => {
    if (busy.current) return;
    const here = window.location.pathname + window.location.search;
    if (to === here || to === window.location.pathname) return;
    if (reduced()) { navigate(to); window.scrollTo(0, 0); return; }
    busy.current = true;
    setPhase('cover');
    setTimeout(() => {
      navigate(to);
      window.scrollTo(0, 0);
      setPhase('reveal');
      setTimeout(() => { setPhase('idle'); busy.current = false; }, 700);
    }, 620);
  }, [navigate]);

  const y = phase === 'cover' ? '0%' : phase === 'reveal' ? '-100%' : '100%';
  const dur = phase === 'idle' ? 0 : 0.62;

  return (
    <Ctx.Provider value={{ go }}>
      {children}
      <motion.div className="curtain curtain-back" aria-hidden="true" animate={{ y }} transition={{ duration: dur, ease: [0.76, 0, 0.24, 1], delay: phase === 'cover' ? 0 : 0.06 }} />
      <motion.div className="curtain" aria-hidden="true" animate={{ y }} transition={{ duration: dur, ease: [0.76, 0, 0.24, 1], delay: phase === 'cover' ? 0.06 : 0 }}>
        <span className="curtain-logo">VELORA</span>
        <span className="curtain-bar"><i /></span>
      </motion.div>
    </Ctx.Provider>
  );
}

/** Drop-in <a> that triggers the page transition. */
export function TLink({ to, onClick, children, ...rest }) {
  const go = useGo();
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}
