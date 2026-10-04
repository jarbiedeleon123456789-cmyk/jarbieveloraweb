import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CarScene } from './CarScene';
import { ASSEMBLY_STEPS, CAR_PARTS, explodeFactor } from '../lib/carParts';
import { JARV_PRODUCTS } from '../lib/jarvProducts';
import { money } from '../config';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function getPhaseLabel(started, hud) {
  if (!started) return 'BUILDING CAR';
  if (hud.exploded) return 'EXPLODED VIEW';
  if (hud.progress < 100) {
    const active = ASSEMBLY_STEPS[hud.active >= 0 ? hud.active : 0];
    return `ASSEMBLING · ${active.label.toUpperCase()}`;
  }
  return 'BUILD COMPLETE';
}

export default function CarShowroom() {
  const reduced = useReducedMotion();
  const simRef = useRef({ phase: 'assembled', start: 0 });
  const [modelReady, setModelReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [hoveredPart, setHoveredPart] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hud, setHud] = useState({ progress: 0, explodeAmount: 100, active: -1, done: 0, exploded: false });

  const onReady = useCallback(() => setModelReady(true), []);

  useEffect(() => {
    if (!modelReady) return undefined;
    const timeout = setTimeout(() => {
      simRef.current = {
        phase: reduced ? 'assembled' : 'assembling',
        start: performance.now(),
      };
      setStarted(true);
    }, 350);
    return () => clearTimeout(timeout);
  }, [modelReady, reduced]);

  useEffect(() => {
    let animationFrame = 0;
    let previous = '';
    const update = () => {
      const sim = simRef.current;
      let sum = 0;
      let active = -1;
      let done = 0;

      ASSEMBLY_STEPS.forEach((part, order) => {
        const factor = reduced && sim.phase !== 'scrubbed'
          ? (sim.phase === 'exploded' ? 1 : 0)
          : explodeFactor(sim, order, performance.now());
        sum += factor;
        if (factor < 0.02) done += 1;
        if (active < 0 && factor > 0.02 && factor < 0.98) active = order;
      });

      const average = sum / ASSEMBLY_STEPS.length;
      const progress = Math.round((1 - average) * 100);
      const explodeAmount = Math.round((sim.phase === 'scrubbed' ? sim.progress : average) * 100);
      const exploded = average >= 0.995;
      const signature = `${progress}|${explodeAmount}|${active}|${done}|${exploded}`;
      if (signature !== previous) {
        previous = signature;
        setHud({
          progress: exploded ? 0 : progress,
          explodeAmount,
          active: exploded ? -1 : active,
          done: exploded ? 0 : done,
          exploded,
        });
      }
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [reduced]);

  useEffect(() => {
    const focusPart = (event) => {
      setSelected(event.detail);
      setSelectedPart(null);
    };
    window.addEventListener('jarv:focus-part', focusPart);
    return () => window.removeEventListener('jarv:focus-part', focusPart);
  }, []);

  const animate = (phase) => {
    simRef.current = { phase: reduced ? (phase === 'exploding' ? 'exploded' : 'assembled') : phase, start: performance.now() };
  };
  const toggleExploded = () => animate(hud.exploded ? 'assembling' : 'exploding');
  const rebuild = () => {
    setSelected(null);
    animate('assembling');
  };
  const scrubAssembly = (event) => {
    simRef.current = {
      phase: 'scrubbed',
      progress: Number(event.target.value) / 100,
    };
  };
  const onModelHover = (key, partId) => {
    setHovered(key);
    setHoveredPart(partId);
  };
  const onModelPick = (key, partId) => {
    setSelected(key);
    setSelectedPart(partId);
  };

  const product = selected ? JARV_PRODUCTS.find((item) => item.three_part === selected) : null;
  const phaseLabel = getPhaseLabel(started, hud);

  return (
    <section id="showroom" className="car-showroom">
      <div className="car-showroom-canvas">
        <Canvas
          dpr={[1, 1.6]}
          camera={{ position: [7.2, 3.4, 7.6], fov: 38 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
          onPointerMissed={() => {
            setSelected(null);
            setSelectedPart(null);
          }}
        >
          <CarScene
            simRef={simRef}
            reduced={reduced}
            hovered={hovered}
            hoveredPart={hoveredPart}
            selected={selected}
            selectedPart={selectedPart}
            onHover={onModelHover}
            onPick={onModelPick}
            onReady={onReady}
            autoRotate={autoRotate}
          />
        </Canvas>
      </div>

      <div className="car-showroom-fade-top" />
      <div className="car-showroom-fade-bottom" />

      <div className="jarv-hero-copy">
        <span className="jarv-live"><i /> BAY 01 — LIVE ASSEMBLY</span>
        <p className="jarv-kicker">THE VELORA PERFORMANCE BAY</p>
        <h1>PART BY<br />PART<span>_</span></h1>
        <p className="jarv-description">Orbit the car, watch its components come together, and select a part to see its details. Every highlighted assembly links to the matching item below.</p>
        <a className="jarv-browse-button" href="#parts">BROWSE THE PARTS <span aria-hidden="true">↓</span></a>
      </div>

      <div className={`jarv-sequence${product ? ' is-hidden-mobile' : ''}`}>
        <div className="jarv-sequence-head"><span>ASSEMBLY SEQUENCE</span><strong className={hud.exploded ? 'is-exploded' : ''}>{phaseLabel}</strong></div>
        <div className="jarv-progress"><span style={{ width: `${hud.progress}%` }} /></div>
        <div className="jarv-sequence-foot"><span>{hud.done}/{ASSEMBLY_STEPS.length} COMPONENTS SEATED</span><span>{hud.progress}%</span></div>
      </div>

      <div className="jarv-part-list">
        <p>COMPONENTS · SELECT TO HIGHLIGHT</p>
        <ol>
          {CAR_PARTS.map((part, index) => (
            <li key={part.key}>
              <button
                type="button"
                className={selected === part.key ? 'is-selected' : ''}
                onClick={() => {
                  setSelected((current) => current === part.key ? null : part.key);
                  setSelectedPart(null);
                }}
              >
                <i className={index < hud.done ? 'is-seated' : ASSEMBLY_STEPS[hud.active]?.key === part.key ? 'is-moving' : ''} />
                <span>{String(index + 1).padStart(2, '0')}</span>
                {part.label}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="jarv-controls" aria-label="Car animation controls">
        <button type="button" className={autoRotate ? 'is-on' : ''} onClick={() => setAutoRotate((value) => !value)} aria-label="Toggle automatic car rotation" title="Auto rotate">↻</button>
        <button type="button" onClick={toggleExploded}>{hud.exploded ? 'REASSEMBLE' : 'EXPLODE'}</button>
        <button type="button" className="jarv-rebuild" onClick={rebuild}>REBUILD</button>
      </div>

      <label className="jarv-explode-scrubber">
        <span>ASSEMBLED</span>
        <input
          type="range"
          min="0"
          max="100"
          value={hud.explodeAmount}
          onChange={scrubAssembly}
          disabled={!modelReady}
          aria-label="Scrub the car disassembly animation"
        />
        <span>EXPLODED</span>
      </label>

      <p className="jarv-canvas-hint">DRAG TO ORBIT · SCROLL TO ZOOM · CLICK A COMPONENT TO INSPECT</p>

      {product && (
        <aside className="jarv-inspected">
          <div className="jarv-inspected-head">
            <span>{product.sku}</span>
            <button type="button" aria-label="Close selected component" onClick={() => {
              setSelected(null);
              setSelectedPart(null);
            }}>×</button>
          </div>
          <p className="jarv-inspected-category">{product.category}</p>
          <h2>{product.product_name}</h2>
          <p className="jarv-inspected-description">{product.description}</p>
          <dl>
            {Object.entries(product.specs).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
            <div><dt>STOCK</dt><dd>{product.quantity < 8 ? `${product.quantity} LEFT` : 'IN STOCK'}</dd></div>
          </dl>
          <div className="jarv-inspected-price">{money(product.price / 100)}</div>
          <button
            type="button"
            className="jarv-product-link"
            onClick={() => document.getElementById(`product-${product.sku}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })}
          >
            VIEW PART BELOW <span aria-hidden="true">↓</span>
          </button>
        </aside>
      )}

      <a
        className="jarv-model-credit"
        href="https://sketchfab.com/3d-models/ferrari-laferrari-f75b682bb0de4a14b3b6c1f52862ca48"
        target="_blank"
        rel="noreferrer"
        title="Ferrari LaFerrari by SC, licensed under CC BY 4.0"
      >
        3D MODEL: FERRARI LAFERRARI BY SC · CC BY 4.0 · INTERACTIVE DISASSEMBLY ADDED
      </a>
    </section>
  );
}
