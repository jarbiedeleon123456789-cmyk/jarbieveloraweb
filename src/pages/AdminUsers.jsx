import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api';

const NEW_USER = { username: '', email: '', password: '', role: 'user', is_active: 1 };

export default function AdminUsers({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const { data } = await api.get('/users');
      setUsers(data.data);
      setState('ready');
    } catch (err) {
      setError(errorMessage(err));
      setState('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openForm = (user = null) => {
    setMessage('');
    setFieldErrors({});
    setForm(user ? { ...user, password: '' } : { ...NEW_USER });
  };

  const updateField = (field) => (event) => {
    const value = field === 'is_active' ? Number(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setFieldErrors({});
    const payload = { ...form };
    if (form.id && !payload.password) delete payload.password;

    try {
      const result = form.id
        ? await api.put(`/users/${form.id}`, payload)
        : await api.post('/users', payload);
      setForm(null);
      setMessage(result.data.message);
      await load();
    } catch (err) {
      if (err.response?.status === 422) setFieldErrors(err.response.data.errors || {});
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (user) => {
    if (!window.confirm(`Permanently delete ${user.username} (${user.email})?`)) return;
    setError('');
    setMessage('');
    try {
      const { data } = await api.delete(`/users/${user.id}`);
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const FieldError = ({ name }) => fieldErrors[name] ? <span className="err">{fieldErrors[name]}</span> : null;

  return (
    <section className="user-management" aria-labelledby="users-heading">
      <div className="dash-head">
        <div>
          <p className="eyebrow">Administrator tools</p>
          <h2 id="users-heading">Manage users</h2>
        </div>
        <button className="btn-solid" type="button" onClick={() => openForm()}>+ Add user</button>
      </div>

      {message && <p className="user-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {form && (
        <form className="user-form-panel" onSubmit={save} noValidate>
          <h3>{form.id ? `Edit ${form.username}` : 'Create user account'}</h3>
          <div className="user-form-grid">
            <label>Username
              <input value={form.username} onChange={updateField('username')} maxLength={100} autoComplete="off" required />
              <FieldError name="username" />
            </label>
            <label>Email
              <input type="email" value={form.email} onChange={updateField('email')} maxLength={255} autoComplete="off" required />
              <FieldError name="email" />
            </label>
            <label>{form.id ? 'New password (optional)' : 'Password'}
              <input type="password" value={form.password} onChange={updateField('password')} minLength={8} autoComplete="new-password" required={!form.id} />
              <FieldError name="password" />
            </label>
            <label>Role
              <select value={form.role} onChange={updateField('role')} disabled={form.id === currentUserId}>
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <FieldError name="role" />
            </label>
            <label>Account status
              <select value={form.is_active} onChange={updateField('is_active')} disabled={form.id === currentUserId}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
              <FieldError name="is_active" />
            </label>
          </div>
          {fieldErrors.user && <p className="form-error" role="alert">{fieldErrors.user}</p>}
          <div className="dash-actions">
            <button className="btn-ghost" type="button" onClick={() => setForm(null)} disabled={busy}>Cancel</button>
            <button className="btn-solid" type="submit" disabled={busy}>{busy ? 'Saving…' : form.id ? 'Save changes' : 'Create user'}</button>
          </div>
        </form>
      )}

      {state === 'loading' && users.length === 0 && <div className="notice"><p>Loading users…</p></div>}
      {state === 'error' && <div className="notice"><p>Could not load users.</p><button className="btn-solid" type="button" onClick={load}>Try again</button></div>}
      {state === 'ready' && users.length === 0 && <div className="notice"><p>No user accounts found.</p></div>}
      {users.length > 0 && (
        <div className="table-wrap">
          <table className="users-table">
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th className="num">Actions</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}{user.id === currentUserId && <span className="muted"> (you)</span>}</td>
                  <td>{user.email}</td>
                  <td><span className="role-label">{user.role}</span></td>
                  <td><span className={user.is_active ? 'status-label active' : 'status-label inactive'}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="num">
                    <button className="btn-mini" type="button" onClick={() => openForm(user)}>Edit</button>
                    <button className="btn-mini danger" type="button" onClick={() => remove(user)} disabled={user.id === currentUserId} title={user.id === currentUserId ? 'You cannot delete your own account' : undefined}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
