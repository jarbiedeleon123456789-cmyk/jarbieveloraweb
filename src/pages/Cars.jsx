import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { errorMessage } from '../api';
import Page, { Eyebrow } from '../components/Page';
import { TLink } from '../transition';
import { money } from '../config';

function stock(q) {
  if (q <= 0) return ['Out of stock', 'out'];
  if (q <= 5) return [`Only ${q} left`, 'low'];
  return [`In stock · ${q}`, 'ok'];
}

export default function Cars() {
  const [parts, setParts] = useState([]);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const reqId = useRef(0);

  const load = useCallback(() => {
    const id = ++reqId.current;
    setState('loading');
    api.get('/catalog', { params: { q: q.trim() || undefined, category: cat === 'All' ? undefined : cat } })
      .then(({ data }) => { if (id === reqId.current) { setParts(data.data); setState('ready'); } })
      .catch((err) => { if (id === reqId.current) { setError(errorMessage(err)); setState('error'); } });
  }, [q, cat]);

  useEffect(() => { api.get('/catalog/categories').then(({ data }) => setCats(data.data)).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <Page>
      <section className="section">
        <Eyebrow>Parts catalog</Eyebrow>
        <h1 className="h1">Genuine parts, ready to ship.</h1>
        <div className="toolbar">
          <input type="search" placeholder="Search parts…" aria-label="Search parts" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="chips" role="tablist">
            {['All', ...cats].map((c) => (
              <button key={c} className={'chip' + (c === cat ? ' is-on' : '')} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        </div>

        {state === 'error' && (
          <div className="notice">
            <p>{error}</p>
            <button className="btn-solid" onClick={load}>Try again</button>
          </div>
        )}
        {state === 'loading' && parts.length === 0 && (
          <div className="grid-parts">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="part skeleton" />)}</div>
        )}
        {state === 'ready' && parts.length === 0 && <div className="notice"><p>No parts match your search.</p></div>}

        <div className="grid-parts">
          <AnimatePresence mode="popLayout">
            {parts.map((p, i) => {
              const [label, tone] = stock(p.quantity);
              return (
                <motion.article
                  key={p.id}
                  layout
                  className="part"
                  initial={{ opacity: 0, y: 46 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  viewport={{ once: true, margin: '0px 0px -40px 0px' }}
                  transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="part-img">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.product_name} loading="lazy" />
                      : <div className="part-noimg">No image</div>}
                    <span className="part-cat">{p.category}</span>
                  </div>
                  <div className="part-body">
                    <h3>{p.product_name}</h3>
                    <p>{p.description}</p>
                    <div className="part-foot">
                      <strong>{money(p.price)}</strong>
                      <span className={'stock ' + tone}>{label}</span>
                    </div>
                    <TLink to={`/contact?part=${encodeURIComponent(p.product_name)}`} className="btn-glass small">ENQUIRE <span className="arrow">↗</span></TLink>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </section>
    </Page>
  );
}
