import { lazy, Suspense, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Page, { Eyebrow } from '../components/Page';
import { JARV_PRODUCTS } from '../lib/jarvProducts';
import { money } from '../config';

const CarShowroom = lazy(() => import('../components/CarShowroom'));

function ProductArtwork({ product }) {
  return (
    <div className="zip-product-art">
      <span className="zip-product-art-grid" />
      <svg viewBox="0 0 180 120" aria-hidden="true">
        <path d="M29 82 45 52l29-17h37l23 18 15 29-7 13H37z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M46 54h86M56 54l12-13h38l17 13M54 95l8-14m63 14-8-14" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="56" cy="91" r="12" fill="#0a0d11" stroke="currentColor" strokeWidth="2" />
        <circle cx="124" cy="91" r="12" fill="#0a0d11" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span>{product.category.toUpperCase()}</span>
      <small>{product.sku}</small>
    </div>
  );
}

function ProductCard({ product, index }) {
  const [imageFailed, setImageFailed] = useState(false);
  const jumpToPart = () => {
    window.dispatchEvent(new CustomEvent('jarv:focus-part', { detail: product.three_part }));
    document.getElementById('showroom')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.article
      id={`product-${product.sku}`}
      className="zip-product"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -35px 0px' }}
      transition={{ duration: 0.45, delay: (index % 4) * 0.045 }}
    >
      <div className="zip-product-visual">
        {product.image && !imageFailed
          ? <img src={product.image} alt={product.product_name} loading="lazy" onError={() => setImageFailed(true)} />
          : <ProductArtwork product={product} />}
        {product.three_part && (
          <button type="button" className="zip-visual-3d" onClick={jumpToPart}>VIEW IN 3D</button>
        )}
        <span className={`zip-stock${product.quantity < 8 ? ' is-low' : ''}`}>
          {product.quantity < 8 ? `${product.quantity} LEFT IN STOCK` : 'IN STOCK'}
        </span>
      </div>
      <div className="zip-product-content">
        <div className="zip-product-meta"><span>{product.sku}</span><span>{product.category}</span></div>
        <h3>{product.product_name}</h3>
        <p>{product.description}</p>
        <div className="zip-product-price">{money(product.price / 100)}</div>
        <div className="zip-product-actions">
          <Link
            className="zip-enquire"
            to={`/contact?part=${encodeURIComponent(product.product_name)}`}
          >
            ENQUIRE ABOUT THIS PART <span aria-hidden="true">↗</span>
          </Link>
          {product.three_part && (
            <button
              type="button"
              className="zip-3d-button"
              onClick={() => {
                jumpToPart();
              }}
              aria-label={`Inspect ${product.product_name} on the 3D car`}
              title="Inspect on the 3D car"
            >
              ◇ <span>3D</span>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function PartsCatalog() {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => ['All', ...new Set(JARV_PRODUCTS.map((product) => product.category))], []);
  const shown = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return JARV_PRODUCTS.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const matchesQuery = !normalized
        || `${product.product_name} ${product.sku} ${product.category} ${product.description}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <section id="parts" className="section zip-parts-section">
      <Eyebrow>R-01 parts catalog</Eyebrow>
      <div className="zip-catalog-heading">
        <div>
          <h2 className="h1">THE PARTS BIN</h2>
          <p>Explore the components from the supplied R-01 asset pack. Select a 3D-marked part to find it on the car.</p>
        </div>
        <label className="zip-search">
          <span>SEARCH PARTS</span>
          <input type="search" placeholder="Search parts or SKU…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <div className="zip-categories" role="group" aria-label="Filter parts by category">
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            className={item === category ? 'is-active' : ''}
            onClick={() => setCategory(item)}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="zip-product-grid">
        {shown.map((product, index) => <ProductCard key={product.sku} product={product} index={index} />)}
      </div>
      {shown.length === 0 && <div className="notice"><p>No parts match your search.</p></div>}
      <p className="zip-catalog-count">{shown.length} ZIP CATALOG SKUS SHOWN</p>
    </section>
  );
}

export default function Cars() {
  return (
    <Page>
      <Suspense fallback={<div className="car-showroom-loading">LOADING THE 3D PERFORMANCE BAY…</div>}>
        <CarShowroom />
      </Suspense>
      <PartsCatalog />
    </Page>
  );
}
