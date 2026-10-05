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
      <section className="section narrow">
        <Eyebrow>Welcome back</Eyebrow>
        <h1 className="h1">Sign in to browse parts.</h1>
        <motion.form className="form-card" onSubmit={submit} noValidate initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn-solid" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in →'}</button>
        </motion.form>
        <p className="auth-switch">New to VELORA? <Link to="/register">Create an account</Link></p>
      </section>
    </Page>
  );
}
