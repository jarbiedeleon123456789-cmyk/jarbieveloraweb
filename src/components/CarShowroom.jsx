import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CarScene } from './CarScene';
import { ASSEMBLY_STEPS, CAR_PARTS, explodeFactor } from '../lib/carParts';
import { JARV_PRODUCTS } from '../lib/jarvProducts';
import { money } from '../config';

function playTone(context, frequency, endFrequency, duration, volume, type = 'sine') {
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function playShowroomSound(context, kind) {
  if (kind === 'engine-start') {
    const now = context.currentTime;
    const duration = 2.6;
    const compressor = context.createDynamicsCompressor();
    const master = context.createGain();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.24;
    master.gain.value = 0.8;
    master.connect(compressor);
    compressor.connect(context.destination);

    const engineFilter = context.createBiquadFilter();
    const engineGain = context.createGain();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(420, now);
    engineFilter.frequency.linearRampToValueAtTime(760, now + 1.45);
    engineFilter.frequency.linearRampToValueAtTime(510, now + duration);
    engineGain.gain.setValueAtTime(0.0001, now);
    engineGain.gain.linearRampToValueAtTime(0.27, now + 0.18);
    engineGain.gain.linearRampToValueAtTime(0.21, now + 0.85);
    engineGain.gain.linearRampToValueAtTime(0.47, now + 1.12);
    engineGain.gain.linearRampToValueAtTime(0.31, now + 1.55);
    engineGain.gain.linearRampToValueAtTime(0.23, now + duration);
    engineFilter.connect(engineGain);
    engineGain.connect(master);

    const engine = context.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.setValueAtTime(47, now);
    engine.frequency.linearRampToValueAtTime(35, now + 0.78);
    engine.frequency.linearRampToValueAtTime(61, now + 1.12);
    engine.frequency.linearRampToValueAtTime(112, now + 1.58);
    engine.frequency.exponentialRampToValueAtTime(76, now + duration);
    engine.connect(engineFilter);
    engine.start(now);
    engine.stop(now + duration);

    const harmonic = context.createOscillator();
    const harmonicGain = context.createGain();
    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(94, now);
    harmonic.frequency.linearRampToValueAtTime(224, now + 1.58);
    harmonic.frequency.exponentialRampToValueAtTime(152, now + duration);
    harmonicGain.gain.value = 0.14;
    harmonic.connect(harmonicGain);
    harmonicGain.connect(engineFilter);
    harmonic.start(now);
    harmonic.stop(now + duration);

    const noiseLength = Math.ceil(context.sampleRate * duration);
    const noiseBuffer = context.createBuffer(1, noiseLength, context.sampleRate);
    const noiseSamples = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseLength; index += 1) {
      noiseSamples[index] = Math.random() * 2 - 1;
    }
    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 520;
    noiseFilter.Q.value = 0.7;
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.setValueAtTime(0.0001, now + 0.12);
    noiseGain.gain.linearRampToValueAtTime(0.2, now + 0.2);
    noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.34);
    noiseGain.gain.setValueAtTime(0.0001, now + 0.42);
    noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.5);
    noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.65);
    noiseGain.gain.setValueAtTime(0.0001, now + 0.7);
    noiseGain.gain.linearRampToValueAtTime(0.2, now + 0.78);
    noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.92);
    noiseGain.gain.setValueAtTime(0.0001, now + 1.02);
    noiseGain.gain.linearRampToValueAtTime(0.11, now + 1.16);
    noiseGain.gain.linearRampToValueAtTime(0.0001, now + 1.72);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);
    noise.stop(now + duration);
    return;
  }

  if (kind === 'motion') {
    const now = context.currentTime;
    const sampleCount = Math.ceil(context.sampleRate * 0.32);
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      samples[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.32);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(now);
    source.stop(now + 0.32);
    playTone(context, 105, 55, 0.32, 0.018);
    return;
  }

  if (kind === 'select') {
    playTone(context, 720, 510, 0.075, 0.035);
    return;
  }

  playTone(context, 540, 310, 0.16, 0.14, 'triangle');
  playTone(context, 105, 62, 0.2, 0.1);
}

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
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audioContextRef = useRef(null);
  const soundEnabledRef = useRef(false);
  const engineStartedRef = useRef(false);
  const [hud, setHud] = useState({ progress: 0, explodeAmount: 100, active: -1, done: 0, exploded: false });
  const AudioContextConstructor = typeof window !== 'undefined'
    ? window.AudioContext || window.webkitAudioContext
    : null;
  const audioSupported = Boolean(AudioContextConstructor);
  const assembled = modelReady && started && hud.done === ASSEMBLY_STEPS.length && !hud.exploded;

  const playSound = (kind) => {
    if (soundEnabledRef.current && audioContextRef.current?.state === 'running') {
      playShowroomSound(audioContextRef.current, kind);
    }
  };

  const toggleSound = () => {
    if (soundEnabled) {
      soundEnabledRef.current = false;
      engineStartedRef.current = false;
      setSoundEnabled(false);
      return;
    }

    try {
      if (!AudioContextConstructor) {
        setAudioError('Sound is not supported by this browser.');
        return;
      }
      const context = audioContextRef.current?.state === 'closed'
        ? new AudioContextConstructor()
        : audioContextRef.current || new AudioContextConstructor();
      audioContextRef.current = context;
      soundEnabledRef.current = true;
      setSoundEnabled(true);
      setAudioError('');
      context.resume()
        .then(() => {
          if (!soundEnabledRef.current) return;
          playShowroomSound(context, 'click');
          if (assembled && !engineStartedRef.current) {
            engineStartedRef.current = true;
            playShowroomSound(context, 'engine-start');
          }
        })
        .catch(() => {
          soundEnabledRef.current = false;
          engineStartedRef.current = false;
          setSoundEnabled(false);
          setAudioError('Sound could not start. Check your browser audio settings.');
        });
    } catch {
        soundEnabledRef.current = false;
        setSoundEnabled(false);
        setAudioError('Could not create audio. Check your browser audio settings.');
    }
  };

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
    if (!assembled || !soundEnabled) {
      engineStartedRef.current = false;
      return;
    }
    const context = audioContextRef.current;
    if (context?.state === 'running' && !engineStartedRef.current) {
      engineStartedRef.current = true;
      playShowroomSound(context, 'engine-start');
    }
  }, [assembled, soundEnabled]);

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
      playSound('select');
    };
    window.addEventListener('jarv:focus-part', focusPart);
    return () => window.removeEventListener('jarv:focus-part', focusPart);
  }, []);

  const animate = (phase) => {
    simRef.current = { phase: reduced ? (phase === 'exploding' ? 'exploded' : 'assembled') : phase, start: performance.now() };
    playSound('motion');
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
    playSound('select');
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
            headlightsOn={assembled}
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
                  playSound('select');
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
        <button
          type="button"
          className={soundEnabled ? 'is-on' : ''}
          onClick={toggleSound}
          disabled={!audioSupported}
          aria-label={soundEnabled ? 'Turn sound effects off' : 'Turn sound effects on'}
          aria-pressed={soundEnabled}
          title={audioSupported ? 'Toggle sound effects' : 'Sound effects are not supported by this browser'}
        >
          SOUND {soundEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
      {audioError && <p className="jarv-audio-error" role="status">{audioError}</p>}

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
