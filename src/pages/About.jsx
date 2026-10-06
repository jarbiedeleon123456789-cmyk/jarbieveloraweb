import { motion } from 'framer-motion';
import Page, { Eyebrow } from '../components/Page';
import { TLink } from '../transition';

const POINTS = [
  ['Genuine & tested', 'Every part is sourced from trusted makers and checked before it leaves our shelf, so it fits and performs as promised.'],
  ['Fitment help', 'Not sure what your car needs? Tell us the make, model and year and we will point you to the right part.'],
  ['Honest pricing', 'Clear prices and real stock counts. What you see in the catalog is what is on the shelf.'],
];

export default function About() {
  return (
    <Page>
      <section className="section about-layout">
        <motion.aside
          className="about-showcase"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="signin-showcase-top">
            <span className="signin-mark" aria-hidden="true">V</span>
            <span>THE VELORA STANDARD</span>
          </div>

          <div className="signin-showcase-copy">
            <Eyebrow>For every road ahead</Eyebrow>
            <h2>Built for<br />the <span>drive.</span></h2>
            <p>
              VELORA began with a simple idea: buying car parts should feel as good as driving the car. We build
              every recommendation around reliability, fitment and the real-world needs of enthusiasts and everyday drivers.
            </p>
          </div>

          <div className="signin-promise">
            <div><span className="signin-promise-icon">01</span><span>Genuine parts</span></div>
            <div><span className="signin-promise-icon">02</span><span>Expert fitment advice</span></div>
            <div><span className="signin-promise-icon">03</span><span>Honest pricing</span></div>
          </div>
        </motion.aside>

        <motion.div
          className="about-panel"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="signin-panel-heading">
            <span className="signin-overline"><span /> ABOUT VELORA</span>
            <h1>Performance gear for drivers who care.</h1>
            <p>We stock brakes, engine components, suspension, lighting, wheels and electrical parts for daily drivers and weekend builds alike.</p>
          </div>

          <div className="about-feature-grid">
            {POINTS.map(([title, text], i) => (
              <motion.article
                key={title}
                className="about-feature"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -30px 0px' }}
                transition={{ duration: 0.55, delay: i * 0.12 }}
              >
                <span className="card-num">0{i + 1}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </motion.article>
            ))}
          </div>

          <TLink to="/cars" className="btn-solid about-cta">
            <span>Browse the catalog</span>
            <span className="signin-submit-arrow" aria-hidden="true">↗</span>
          </TLink>
        </motion.div>
      </section>
    </Page>
  );
}
