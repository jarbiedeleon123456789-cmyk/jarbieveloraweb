import { motion } from 'framer-motion';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Page, { Eyebrow } from '../components/Page';
import { CONTACT_EMAIL } from '../config';

export default function Contact() {
  const { search } = useLocation();
  const part = new URLSearchParams(search).get('part') || '';
  const [form, setForm] = useState({ name: '', email: '', part, message: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const subject = form.part ? `Parts enquiry: ${form.part}` : 'Parts enquiry';
    const body = `${form.message}\n\n— ${form.name} (${form.email})`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Page>
      <section className="section contact-layout">
        <motion.aside
          className="about-showcase"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="signin-showcase-top">
            <span className="signin-mark" aria-hidden="true">V</span>
            <span>VELORA SUPPORT</span>
          </div>

          <div className="signin-showcase-copy">
            <Eyebrow>Need help choosing?</Eyebrow>
            <h2>Talk to the <span>team.</span></h2>
            <p>
              Tell us what you are driving and what you need. We can help narrow the right part, confirm fitment,
              and keep your next install smooth from the first message to final fit.
            </p>
          </div>

          <div className="contact-detail-list">
            <div className="contact-detail">
              <span>Email</span>
              <strong>{CONTACT_EMAIL}</strong>
            </div>
            <div className="contact-detail">
              <span>Hours</span>
              <strong>Mon–Fri · 9am–6pm</strong>
            </div>
            <div className="contact-detail">
              <span>Support</span>
              <strong>Fitment, stock & delivery questions</strong>
            </div>
          </div>
        </motion.aside>

        <motion.div
          className="contact-panel"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="signin-panel-heading">
            <span className="signin-overline"><span /> CONTACT</span>
            <h1>Ask us about a part.</h1>
            <p>Send a quick note with your car and part details. We will get the right information to you.</p>
          </div>

          <form className="form-card contact-form" onSubmit={submit}>
            <div className="row contact-row">
              <label>Your name
                <input required value={form.name} onChange={set('name')} autoComplete="name" />
              </label>
              <label>Your email
                <input required type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              </label>
            </div>

            <label>Part you are interested in
              <input value={form.part} onChange={set('part')} placeholder="e.g. Ceramic Brake Pad Set" />
            </label>

            <label>Message
              <textarea required rows={5} value={form.message} onChange={set('message')} placeholder="Car make, model, year, and what you need…" />
            </label>

            <button className="btn-solid signin-submit contact-submit" type="submit">
              <span>Send enquiry</span>
              <span className="signin-submit-arrow" aria-hidden="true">↗</span>
            </button>
          </form>
        </motion.div>
      </section>
    </Page>
  );
}
