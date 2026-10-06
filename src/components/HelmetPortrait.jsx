import { useEffect, useRef, useState } from 'react';

export default function HelmetPortrait() {
  const stageRef = useRef(null);
  const helmetRef = useRef(null);
  const trailRef = useRef(null);
  const faceRef = useRef(null);
  const faceTrailRef = useRef(null);
  const spotlightRef = useRef(null);
  const target = useRef({ x: 0, y: 0, radiusX: 0, radiusY: 0 });
  const current = useRef({ x: 0, y: 0, radiusX: 0, radiusY: 0 });
  const trailPoints = useRef([]);
  const lastTrailPoint = useRef(null);
  const fullHelmetRef = useRef(false);
  const [fullHelmet, setFullHelmet] = useState(false);
  const [portraitMissing, setPortraitMissing] = useState(false);

  const moveReveal = (event) => {
    const stage = stageRef.current;
    const bounds = stage?.getBoundingClientRect();
    if (!bounds) return;
    target.current.x = event.clientX - bounds.left;
    target.current.y = event.clientY - bounds.top;
    const now = performance.now();
    const nextPoint = { x: target.current.x, y: target.current.y, time: now };
    const previous = lastTrailPoint.current;
    if (previous) {
      const distance = Math.hypot(nextPoint.x - previous.x, nextPoint.y - previous.y);
      const spacing = 18;
      const steps = Math.floor(distance / spacing);
      const angle = Math.atan2(nextPoint.y - previous.y, nextPoint.x - previous.x);
      for (let step = 1; step <= steps; step += 1) {
        const progress = step / (steps + 1);
        trailPoints.current.push({
          x: previous.x + (nextPoint.x - previous.x) * progress,
          y: previous.y + (nextPoint.y - previous.y) * progress,
          angle,
          time: now - (1 - progress) * 90,
        });
      }
      trailPoints.current.push({ ...nextPoint, angle });
    } else {
      trailPoints.current.push({ ...nextPoint, angle: -0.2 });
    }
    trailPoints.current = trailPoints.current.slice(-18);
    lastTrailPoint.current = nextPoint;
    if (current.current.radiusX < 1) {
      current.current.x = target.current.x;
      current.current.y = target.current.y;
    }
  };

  const startReveal = (event) => {
    moveReveal(event);
    const stage = stageRef.current;
    const radiusX = Math.min(116, (stage?.clientWidth ?? 0) * 0.24);
    target.current.radiusX = radiusX;
    target.current.radiusY = radiusX * 0.78;
    stage?.classList.add('is-hovering');
  };

  const stopReveal = () => {
    target.current.radiusX = 0;
    target.current.radiusY = 0;
    lastTrailPoint.current = null;
    stageRef.current?.classList.remove('is-hovering');
  };

  const toggleHelmetMode = () => {
    trailPoints.current = [];
    lastTrailPoint.current = null;
    fullHelmetRef.current = !fullHelmetRef.current;
    setFullHelmet(fullHelmetRef.current);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    let frame = 0;
    let animating = false;
    const trailImages = trailRef.current?.querySelectorAll('img') ?? [];
    const faceTrailImages = faceTrailRef.current?.querySelectorAll('img') ?? [];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      const now = performance.now();
      const point = current.current;
      const destination = target.current;
      const positionEase = reducedMotion ? 1 : 0.12;
      const radiusEase = reducedMotion ? 1 : 0.1;
      point.x += (destination.x - point.x) * positionEase;
      point.y += (destination.y - point.y) * positionEase;
      point.radiusX += (destination.radiusX - point.radiusX) * radiusEase;
      point.radiusY += (destination.radiusY - point.radiusY) * radiusEase;

      const isFullHelmet = fullHelmetRef.current;
      if (helmetRef.current) {
        const { radiusX, radiusY, x, y } = point;
        const softPatch = (rx, ry, cx, cy) => `radial-gradient(ellipse ${rx}px ${ry}px at ${cx}px ${cy}px, #000 38%, rgba(0,0,0,.92) 58%, transparent 100%)`;
        const mask = [
          softPatch(radiusX, radiusY, x, y),
          softPatch(radiusX * 0.52, radiusY * 0.72, x - radiusX * 0.7, y - radiusY * 0.22),
          softPatch(radiusX * 0.44, radiusY * 0.6, x + radiusX * 0.68, y + radiusY * 0.28),
          softPatch(radiusX * 0.34, radiusY * 0.48, x - radiusX * 0.12, y + radiusY * 0.76),
        ].join(', ');
        helmetRef.current.style.maskImage = isFullHelmet ? 'none' : mask;
        helmetRef.current.style.webkitMaskImage = isFullHelmet ? 'none' : mask;
        if (faceRef.current) {
          faceRef.current.style.maskImage = isFullHelmet ? mask : 'radial-gradient(ellipse 0px 0px at 0 0, #000, transparent)';
          faceRef.current.style.webkitMaskImage = faceRef.current.style.maskImage;
        }
      }
      const bounds = stage.getBoundingClientRect();
      const pointerX = bounds.width ? (point.x / bounds.width - 0.5) * 2 : 0;
      const pointerY = bounds.height ? (point.y / bounds.height - 0.5) * 2 : 0;
      stage.style.setProperty('--pointer-x', `${point.x}px`);
      stage.style.setProperty('--pointer-y', `${point.y}px`);
      stage.style.setProperty('--parallax-x', `${pointerX * -3}px`);
      stage.style.setProperty('--parallax-y', `${pointerY * -3}px`);
      stage.style.setProperty('--helmet-x', `${pointerX * 5}px`);
      stage.style.setProperty('--helmet-y', `${pointerY * 7}px`);
      stage.style.setProperty('--helmet-tilt', `${-13 + pointerX * 6}deg`);
      if (spotlightRef.current) {
        spotlightRef.current.style.setProperty('--spotlight-width', `${Math.max(0, point.radiusX * 2.5)}px`);
        spotlightRef.current.style.setProperty('--spotlight-height', `${Math.max(0, point.radiusY * 2.4)}px`);
      }

      const lifetime = reducedMotion ? 320 : 1900;
      let hasTrail = false;
      const renderTrail = (images) => {
        images.forEach((image, index) => {
          const trailPoint = trailPoints.current[index];
          if (!trailPoint) {
            image.style.opacity = '0';
            return;
          }
          const age = now - trailPoint.time;
          const progress = Math.min(1, age / lifetime);
          if (progress >= 1) {
            image.style.opacity = '0';
            return;
          }
          hasTrail = true;
          const size = 0.68 + (index % 4) * 0.11;
          const width = Math.min(55, stage.clientWidth * 0.115) * size;
          const height = width * (index % 3 === 0 ? 0.48 : 0.72);
          image.style.inset = '0';
          image.style.width = '100%';
          image.style.height = '100%';
          image.style.opacity = `${(1 - progress) ** 1.1 * 0.82}`;
          const offsetX = Math.sin(index * 1.7) * width * 0.38;
          const offsetY = Math.cos(index * 1.3) * height * 0.4;
          const mask = `radial-gradient(ellipse ${width}px ${height}px at ${trailPoint.x + offsetX}px ${trailPoint.y + offsetY}px, #000 32%, rgba(0,0,0,.94) 56%, transparent 100%)`;
          image.style.maskImage = mask;
          image.style.webkitMaskImage = mask;
        });
      };
      renderTrail(isFullHelmet ? faceTrailImages : trailImages);
      (isFullHelmet ? trailImages : faceTrailImages).forEach((image) => { image.style.opacity = '0'; });

      trailPoints.current = trailPoints.current.filter((trailPoint) => now - trailPoint.time < lifetime);
      if (point.radiusX < 0.1 && destination.radiusX === 0 && !hasTrail) {
        animating = false;
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    const animate = () => {
      if (animating) return;
      animating = true;
      frame = window.requestAnimationFrame(tick);
    };
    const onEnter = (event) => {
      startReveal(event);
      animate();
    };
    const onMove = (event) => {
      moveReveal(event);
      animate();
    };
    const onLeave = () => {
      stopReveal();
      animate();
    };

    stage.addEventListener('pointerenter', onEnter);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    stage.addEventListener('pointerdown', onEnter);
    stage.addEventListener('pointerup', onLeave);
    stage.addEventListener('pointercancel', onLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      stage.removeEventListener('pointerenter', onEnter);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('pointerdown', onEnter);
      stage.removeEventListener('pointerup', onLeave);
      stage.removeEventListener('pointercancel', onLeave);
    };
  }, []);

  return (
    <div className="about-me-portrait-shell">
      <button
        className="about-me-helmet-toggle"
        type="button"
        aria-pressed={fullHelmet}
        onClick={toggleHelmetMode}
      >
        {fullHelmet ? 'Full helmet on' : 'Show full helmet'}
        <span aria-hidden="true">{fullHelmet ? '↗' : '↻'}</span>
      </button>
      <div className={`about-me-portrait${fullHelmet ? ' is-full-helmet' : ''}`} ref={stageRef}>
        {portraitMissing ? (
          <div className="about-me-portrait-fallback" role="status">
            Portrait image could not be loaded.
          </div>
        ) : (
          <img
            className="about-me-portrait-photo"
            src="/about/me.png"
            alt="Jarbie De Leon"
            draggable="false"
            onError={() => setPortraitMissing(true)}
          />
        )}
        <span className="about-me-spotlight" ref={spotlightRef} aria-hidden="true" />
        {!portraitMissing && (
          <img className="about-me-portrait-face-reveal" ref={faceRef} src="/about/me.png" alt="" draggable="false" />
        )}
        {!portraitMissing && (
          <img
            className="about-me-portrait-helmet"
            ref={helmetRef}
            src="/about/helmet.png"
            alt=""
            draggable="false"
          />
        )}
        {!portraitMissing && (
          <div className="about-me-helmet-trail" ref={trailRef} aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <img key={index} src="/about/helmet.png" alt="" draggable="false" />
            ))}
          </div>
        )}
        {!portraitMissing && (
          <div className="about-me-face-trail" ref={faceTrailRef} aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <img key={index} src="/about/me.png" alt="" draggable="false" />
            ))}
          </div>
        )}
        <div className="about-me-portrait-fade" aria-hidden="true" />
        <span className="about-me-portrait-hint" aria-hidden="true">
          {fullHelmet ? 'Hover the helmet to reveal your face' : 'Move your cursor to reveal'}
        </span>
      </div>
    </div>
  );
}
