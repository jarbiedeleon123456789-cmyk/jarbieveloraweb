import { useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Page, { Eyebrow } from '../components/Page';
import { useAuth } from '../auth';
import { useGo } from '../transition';
import { errorMessage } from '../api';

export default function Register() {
  const { user, register } = useAuth();
  const location = useLocation();
  const go = useGo();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hadUser = useRef(Boolean(user));

  if (user && hadUser.current) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await register(username.trim(), email.trim(), password);
      go(location.state?.from || '/cars');
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      setError(fieldErrors ? Object.values(fieldErrors).filter(Boolean)[0] : errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Page>
      <section className="section narrow">
        <Eyebrow>Join VELORA</Eyebrow>
        <h1 className="h1">Create your account.</h1>
        <p className="lead">Sign up to browse car parts and the catalog.</p>
        <motion.form className="form-card" onSubmit={submit} noValidate initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}>
          <label>Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={100} required />
          </label>
          <label>Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={255} required />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            <span className="field-hint">Use at least 8 characters.</span>
          </label>
          <label>Confirm password
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn-solid" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account →'}</button>
        </motion.form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </section>
    </Page>
  );
}
