import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import { TLink } from '../transition';
import { HERO_VIDEO } from '../config';

export default function Hero() {
  const videoRef = useRef(null);

  // The background video must always be playing: resume it on every event that could stop it.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    const onVisible = () => play();
    play();
    ['pause', 'ended', 'loadedmetadata', 'canplay'].forEach((e) => v.addEventListener(e, play));
    document.addEventListener('visibilitychange', onVisible);
    const watchdog = setInterval(() => { if (v.paused) play(); }, 1000);
    return () => {
      ['pause', 'ended', 'loadedmetadata', 'canplay'].forEach((e) => v.removeEventListener(e, play));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(watchdog);
    };
  }, []);

  return (
    <section className="hero">
      <video
        ref={videoRef}
        className="hero-video"
        src={HERO_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="hero-overlay" />

      <Navbar home />

      <motion.h1
        className="hero-title"
        aria-label="Regal Drive"
        initial={{ opacity: 0, y: 70, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
      >
        REGAL DRIVE
      </motion.h1>

      <div className="hero-copy">
        <motion.h2 initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}>
          Upgrade Your Ride With Premium Car Parts
        </motion.h2>
        <motion.p initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.75 }}>
          Genuine performance parts, expert fitment advice, and honest pricing — everything your car needs in one place.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.9 }}>
          <TLink to="/cars" className="btn-glass">
            DISCOVER NOW <span className="arrow">↗</span>
          </TLink>
        </motion.div>
      </div>
    </section>
  );
}
