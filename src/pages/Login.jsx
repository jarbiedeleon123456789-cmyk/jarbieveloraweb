import { useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Page, { Eyebrow } from '../components/Page';
import { useAuth } from '../auth';
import { useGo } from '../transition';
import { errorMessage } from '../api';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const go = useGo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const hadUser = useRef(Boolean(user)); // already signed in when the page opened
  if (user && hadUser.current) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const signedInUser = await login(email.trim(), password);
      go(location.state?.from || (signedInUser.role === 'admin' ? '/dashboard' : '/cars'));
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      setError(fieldErrors ? Object.values(fieldErrors).filter(Boolean)[0] : errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Page>
      <section className="section signin-layout">
        <motion.aside
          className="signin-showcase"
          aria-label="VELORA parts promise"
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
            <p>Find the right parts for your next chapter. Genuine essentials, carefully chosen for drivers who care about every detail.</p>
          </div>
          <div className="signin-promise">
            <div><span className="signin-promise-icon">01</span><span>Genuine parts</span></div>
            <div><span className="signin-promise-icon">02</span><span>Expert fitment advice</span></div>
            <div><span className="signin-promise-icon">03</span><span>Honest pricing</span></div>
          </div>
          <span className="signin-showcase-index" aria-hidden="true">VELORA · 01</span>
        </motion.aside>

        <motion.div
          className="signin-panel"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="signin-panel-heading">
            <span className="signin-overline"><span /> MEMBER ACCESS</span>
            <h1>Welcome<br />back.</h1>
            <p>Sign in to continue to your VELORA account.</p>
          </div>
          <motion.form
            className="form-card signin-form"
            onSubmit={submit}
            noValidate
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.48 } } }}
          >
            <motion.label variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              Email address
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </motion.label>
            <motion.label className="signin-password-field" variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              Password
              <span className="signin-password-control">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
                <button type="button" className="signin-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </span>
            </motion.label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <motion.button className="btn-solid signin-submit" type="submit" disabled={busy} whileHover={busy ? undefined : { y: -2 }} whileTap={busy ? undefined : { scale: 0.985 }} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}>
              <span>{busy ? 'Signing in…' : 'Sign in to your account'}</span>
              <span className="signin-submit-arrow" aria-hidden="true">↗</span>
            </motion.button>
          </motion.form>
          <p className="auth-switch signin-switch">New to VELORA? <Link to="/register">Create an account <span aria-hidden="true">→</span></Link></p>
          <p className="signin-secure"><span aria-hidden="true">◇</span> Your VELORA account, ready when you are.</p>
        </motion.div>
      </section>
    </Page>
  );
}
