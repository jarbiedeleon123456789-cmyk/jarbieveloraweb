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
      <section className="section narrow">
        <Eyebrow>Contact</Eyebrow>
        <h1 className="h1">Ask us about a part.</h1>
        <p className="lead">Tell us your car and the part you need. Sending opens your email app with the message ready to go.</p>
        <form className="form-card" onSubmit={submit}>
          <div className="row">
            <label>Your name<input required value={form.name} onChange={set('name')} autoComplete="name" /></label>
            <label>Your email<input required type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
          </div>
          <label>Part you are interested in<input value={form.part} onChange={set('part')} placeholder="e.g. Ceramic Brake Pad Set" /></label>
          <label>Message<textarea required rows={5} value={form.message} onChange={set('message')} placeholder="Car make, model, year, and what you need…" /></label>
          <button className="btn-solid" type="submit">Send enquiry →</button>
        </form>
      </section>
    </Page>
  );
}
