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
      <section className="section narrow">
        <Eyebrow>About VELORA</Eyebrow>
        <h1 className="h1">Built for people who care what is under the hood.</h1>
        <p className="lead">
          VELORA began with a simple idea: buying car parts should feel as good as driving the car. We stock
          brakes, engine components, suspension, lighting, wheels and electrical parts for daily drivers and weekend
          builds alike.
        </p>
      </section>
      <section className="section grid-3">
        {POINTS.map(([title, text], i) => (
          <motion.article key={title} className="card-info" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -40px 0px' }} transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}>
            <span className="card-num">0{i + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </motion.article>
        ))}
      </section>
      <section className="section narrow center">
        <TLink to="/cars" className="btn-glass">BROWSE THE CATALOG <span className="arrow">↗</span></TLink>
      </section>
    </Page>
  );
}
