import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api, { errorMessage } from '../api';
import { useAuth } from '../auth';
import { useGo } from '../transition';
import Page, { Eyebrow } from '../components/Page';
import { PART_IMAGES, money } from '../config';
import AdminUsers from './AdminUsers';

const EMPTY = { product_name: '', category: '', price: '', quantity: '', image_url: '', description: '' };

function Modal({ children, onClose, label }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal" role="dialog" aria-modal="true" aria-label={label} initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ProductForm({ initial, categories, onSaved, onClose }) {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState(initial ? {
    product_name: initial.product_name, category: initial.category, price: String(initial.price), quantity: String(initial.quantity),
    image_url: initial.image_url || '', description: initial.description || '',
  } : EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => (er[k] ? { ...er, [k]: undefined } : er)); // clear a field's error once it is edited
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({}); setFormError(''); setBusy(true);
    try {
      const payload = { ...form };
      const res = editing ? await api.put(`/products/${initial.id}`, payload) : await api.post('/products', payload);
      onSaved(res.data.message);
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  const Err = ({ k }) => (errors[k] ? <span className="err">{errors[k]}</span> : null);

  return (
    <form onSubmit={submit} noValidate>
      <h2>{editing ? 'Edit part' : 'Add a part'}</h2>
      <label>Part name<input value={form.product_name} onChange={set('product_name')} maxLength={100} /><Err k="product_name" /></label>
      <div className="row">
        <label>Price (USD)<input type="number" step="0.01" min="0" value={form.price} onChange={set('price')} /><Err k="price" /></label>
        <label>Quantity<input type="number" step="1" min="0" value={form.quantity} onChange={set('quantity')} /><Err k="quantity" /></label>
      </div>
      <label>Category<input list="cats" value={form.category} onChange={set('category')} placeholder="e.g. Brakes" maxLength={60} /><Err k="category" />
        <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </label>
      <label>Picture
        <select value={PART_IMAGES.some(([, u]) => u === form.image_url) ? form.image_url : ''} onChange={(e) => { const v = e.target.value; if (v) { setForm((f) => ({ ...f, image_url: v })); setErrors((er) => ({ ...er, image_url: undefined })); } }}>
          <option value="">Choose a built-in picture…</option>
          {PART_IMAGES.map(([name, url]) => <option key={url} value={url}>{name}</option>)}
        </select>
      </label>
      <label>Picture link (optional, your own image URL)<input value={form.image_url} onChange={set('image_url')} placeholder="https://… or /parts/turbo.svg" /><Err k="image_url" /></label>
      {form.image_url && <img className="preview" src={form.image_url} alt="Preview" onError={(e) => { e.currentTarget.style.display = 'none'; }} onLoad={(e) => { e.currentTarget.style.display = 'block'; }} />}
      <label>Description<textarea rows={3} value={form.description} onChange={set('description')} /><Err k="description" /></label>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-solid" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add part'}</button>
      </div>
    </form>
  );
}

export default function Dashboard() {
  const { user, ready, logout } = useAuth();
  const go = useGo();
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // {type:'form', item} | {type:'delete', item}
  const [toast, setToast] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setState('loading');
    api.get('/products')
      .then(({ data }) => { setRows(data.data); setState('ready'); })
      .catch((err) => { setError(errorMessage(err)); setState('error'); });
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(''), 2800); return () => clearTimeout(t); }, [toast]);

  if (!ready) return <div className="boot">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/cars" replace />;

  const saved = (msg) => { setModal(null); setToast(msg); load(); };
  const remove = async () => {
    setDeleting(true);
    try { await api.delete(`/products/${modal.item.id}`); setModal(null); setToast('Product deleted'); load(); }
    catch (err) { setToast(errorMessage(err)); setModal(null); }
    setDeleting(false);
  };
  const doLogout = async () => { await logout(); go('/login'); };
  const categories = [...new Set(rows.map((r) => r.category))];

  return (
    <Page>
      <section className="section">
        <div className="dash-head">
          <div>
            <Eyebrow>Dashboard · {user.email}</Eyebrow>
            <h1 className="h1">Manage parts</h1>
          </div>
          <div className="dash-actions">
            <button className="btn-solid" onClick={() => setModal({ type: 'form', item: null })}>+ Add part</button>
            <button className="btn-ghost" onClick={doLogout}>Log out</button>
          </div>
        </div>

        {state === 'error' && <div className="notice"><p>{error}</p><button className="btn-solid" onClick={load}>Try again</button></div>}
        {state === 'loading' && rows.length === 0 && <div className="notice"><p>Loading parts…</p></div>}
        {state === 'ready' && rows.length === 0 && <div className="notice"><p>No parts yet. Add your first one.</p></div>}

        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Part</th><th>Category</th><th className="num">Price</th><th className="num">Qty</th><th className="num">Actions</th></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {rows.map((r) => (
                    <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td><div className="cell-part">{r.image_url ? <img src={r.image_url} alt="" /> : <span className="thumb-none" />}<span>{r.product_name}</span></div></td>
                      <td>{r.category}</td>
                      <td className="num">{money(r.price)}</td>
                      <td className="num">{r.quantity}</td>
                      <td className="num">
                        <button className="btn-mini" onClick={() => setModal({ type: 'form', item: r })}>Edit</button>
                        <button className="btn-mini danger" onClick={() => setModal({ type: 'delete', item: r })}>Delete</button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {user.role === 'admin' && (
        <section className="section">
          <AdminUsers currentUserId={Number(user.id)} />
        </section>
      )}

      <AnimatePresence>
        {modal?.type === 'form' && (
          <Modal key="form" label="Part form" onClose={() => setModal(null)}>
            <ProductForm initial={modal.item} categories={categories} onSaved={saved} onClose={() => setModal(null)} />
          </Modal>
        )}
        {modal?.type === 'delete' && (
          <Modal key="del" label="Confirm delete" onClose={() => setModal(null)}>
            <h2>Delete this part?</h2>
            <p className="muted"><strong>{modal.item.product_name}</strong> will be removed permanently.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-danger" onClick={remove} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>{toast}</motion.div>}</AnimatePresence>
    </Page>
  );
}
