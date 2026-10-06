import { motion } from 'framer-motion';
import Page, { Eyebrow } from '../components/Page';
import HelmetPortrait from '../components/HelmetPortrait';
import { TLink } from '../transition';

const FOCUS = [
  ['01', 'Design'],
  ['02', 'Development'],
  ['03', 'Motorsport'],
];

export default function About() {
  return (
    <Page>
      <section className="about-me-page" aria-labelledby="about-me-title">
        <span className="about-me-backdrop" aria-hidden="true">About</span>
        <motion.div
          className="about-me-copy"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Eyebrow>About me</Eyebrow>
          <h1 id="about-me-title">
            Driven by<br /><span>speed</span> &amp; detail.
          </h1>
          <p className="about-me-intro">
            I’m Jarbie, a creative developer drawn to performance — on track and on screen. I build considered
            digital experiences with a focus on clarity, character, and the details that make them feel alive.
          </p>
          <div className="about-me-focus">
            {FOCUS.map(([number, label]) => (
              <div key={number}>
                <strong>{number}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <TLink to="/contact" className="about-me-contact">
            Let’s connect <span aria-hidden="true">↗</span>
          </TLink>
        </motion.div>

        <motion.div
          className="about-me-visual"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <HelmetPortrait />
          <span className="about-me-location">PHILIPPINES · 01</span>
        </motion.div>
      </section>
    </Page>
  );
}
