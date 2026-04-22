'use client';
import { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { useAdminStore } from '@/store/adminStore';
import type { Category } from '@/types';

const CARD_CLASSES    = ['card-street','card-women','card-drift','card-archive','card-minimal','card-oversized'];
const PATTERN_CLASSES = ['card-pattern-1','card-pattern-2','card-pattern-3','card-pattern-4'];

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const emptyForm = () => ({
  name: '', label: '', description: '', hero_badge: '',
  card_class: 'card-street', pattern_class: 'card-pattern-1',
  image_url: '',
});

type FormState = ReturnType<typeof emptyForm>;

async function uploadCategoryImage(file: File, catId: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('catId', catId);
  const res = await fetch('/api/admin/category-image', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Upload failed');
  }
  const { url } = await res.json();
  return url;
}

export default function AdminCategories() {
  const { categories: cats, loadCategories, upsertCategory, deleteCategory } = useAdminStore();
  const [editing,   setEditing]   = useState<Category | null>(null);
  const [adding,    setAdding]    = useState(false);
  const [deleting,  setDeleting]  = useState<Category | null>(null);
  const [form,      setForm]      = useState<FormState>(emptyForm());
  const [saved,     setSaved]     = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const flashTimer  = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = () => {
    setSaved(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSaved(false), 2000);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name, label: c.label,
      description: c.description ?? '', hero_badge: c.hero_badge ?? '',
      card_class: c.card_class, pattern_class: c.pattern_class,
      image_url: c.image_url ?? '',
    });
    setErrors({});
  };

  const validate = (f: FormState) => {
    const e: Record<string, string> = {};
    if (!f.name.trim())  e.name  = 'Category name is required';
    if (!f.label.trim()) e.label = 'Short label is required';
    if (!f.hero_badge.trim()) e.hero_badge = 'Badge text is required (2–4 letters)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveEdit = async () => {
    if (!validate(form) || !editing) return;
    await upsertCategory({
      id: editing.id,
      slug: slugify(form.name) || editing.slug,
      name: form.name.trim(), label: form.label.trim(),
      description: form.description.trim(), hero_badge: form.hero_badge.trim().toUpperCase(),
      card_class: form.card_class, pattern_class: form.pattern_class,
      image_url: form.image_url.trim() || undefined,
    });
    setEditing(null); flash();
  };

  const saveNew = async () => {
    if (!validate(form)) return;
    const id  = `cat-custom-${Date.now()}`;
    const slug = slugify(form.name) || id;
    await upsertCategory({
      id, slug,
      name: form.name.trim(), label: form.label.trim(),
      description: form.description.trim() || undefined,
      hero_badge: form.hero_badge.trim().toUpperCase(),
      card_class: form.card_class, pattern_class: form.pattern_class,
      image_url: form.image_url.trim() || undefined,
      created_at: new Date().toISOString(),
    });
    setAdding(false); setForm(emptyForm()); flash();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteCategory(deleting.id);
    setDeleting(null); flash();
  };

  const resetAll = async () => {
    if (!window.confirm('Reset all categories back to defaults? Custom categories will be removed.')) return;
    for (const c of cats.filter(c => !CATEGORIES.some(b => b.id === c.id))) {
      await deleteCategory(c.id);
    }
    flash();
  };

  const isBase = (id: string) => CATEGORIES.some(c => c.id === id);

  const fld = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleImageUpload = async (file: File) => {
    const tempId = editing?.id ?? `new-${Date.now()}`;
    setUploading(true);
    try {
      const url = await uploadCategoryImage(file, tempId);
      setForm(p => ({ ...p, image_url: url }));
    } catch (err) {
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const FormFields = () => (
    <>
      {/* Category Image */}
      <div className="adm-field">
        <label className="adm-field-label">Category Image <span style={{ fontSize:10, color:'var(--adm-dim)' }}>(shown in Shop by Category)</span></label>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
          {form.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.image_url} alt="category" style={{ width:64, height:64, objectFit:'cover', border:'1px solid rgba(255,255,255,0.1)' }} />
          ) : (
            <div style={{ width:64, height:64, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--adm-dim)', letterSpacing:'0.1em' }}>RE</div>
          )}
          <div style={{ flex:1 }}>
            <input
              type="file"
              accept="image/*"
              style={{ display:'none' }}
              ref={fileInputRef}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ background:'rgba(195,206,148,0.1)', border:'1px solid rgba(195,206,148,0.25)', color: uploading ? 'rgba(255,255,255,0.3)' : 'rgba(195,206,148,0.8)', cursor: uploading ? 'not-allowed' : 'pointer', padding:'6px 12px', fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', display:'block', marginBottom:6 }}
            >
              {uploading ? '⏳ Uploading…' : '📷 Upload Image'}
            </button>
            <input className="adm-field-input" value={form.image_url} onChange={fld('image_url')}
              placeholder="Or paste image URL directly" style={{ fontSize:11 }} />
          </div>
        </div>
        {form.image_url && (
          <button onClick={() => setForm(p => ({ ...p, image_url: '' }))}
            style={{ background:'none', border:'none', color:'rgba(255,107,107,0.6)', cursor:'pointer', fontSize:11, padding:0 }}>
            ✕ Remove image
          </button>
        )}
      </div>
      <div className="adm-field">
        <label className="adm-field-label">Full Category Name <span style={{ color:'var(--adm-red)' }}>*</span></label>
        <input className="adm-field-input" value={form.name} onChange={e => { fld('name')(e); setErrors(p => ({...p, name:''})); }}
          placeholder="e.g. Men's Polo T-Shirt" />
        {errors.name && <div style={{ fontSize:11, color:'var(--adm-red)', marginTop:4 }}>{errors.name}</div>}
        <div style={{ fontSize:10, color:'var(--adm-dim)', marginTop:4 }}>Shown in collection overlays and product pages.</div>
      </div>

      <div className="adm-field-row">
        <div className="adm-field">
          <label className="adm-field-label">Short Label <span style={{ color:'var(--adm-red)' }}>*</span></label>
          <input className="adm-field-input" value={form.label} onChange={e => { fld('label')(e); setErrors(p => ({...p, label:''})); }}
            placeholder="e.g. Men's" />
          {errors.label && <div style={{ fontSize:11, color:'var(--adm-red)', marginTop:4 }}>{errors.label}</div>}
          <div style={{ fontSize:10, color:'var(--adm-dim)', marginTop:4 }}>Shown in nav pills and filters.</div>
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Hero Badge <span style={{ color:'var(--adm-red)' }}>*</span> <span style={{ fontSize:9, color:'var(--adm-dim)' }}>2–4 letters</span></label>
          <input className="adm-field-input" value={form.hero_badge}
            onChange={e => { setForm(p => ({...p, hero_badge: e.target.value.toUpperCase().slice(0,4)})); setErrors(p => ({...p, hero_badge:''})); }}
            placeholder="e.g. MPL" maxLength={4} style={{ textTransform:'uppercase', letterSpacing:'0.15em', fontWeight:700 }} />
          {errors.hero_badge && <div style={{ fontSize:11, color:'var(--adm-red)', marginTop:4 }}>{errors.hero_badge}</div>}
        </div>
      </div>

      <div className="adm-field">
        <label className="adm-field-label">Description</label>
        <textarea className="adm-field-textarea" value={form.description} onChange={fld('description')}
          placeholder="Short description of this category" rows={2} />
      </div>

      <div className="adm-field-row">
        <div className="adm-field">
          <label className="adm-field-label">Card Style</label>
          <select className="adm-field-select" value={form.card_class} onChange={fld('card_class')}>
            {CARD_CLASSES.map(c => <option key={c} value={c}>{c.replace('card-', '')}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label className="adm-field-label">Card Pattern</label>
          <select className="adm-field-select" value={form.pattern_class} onChange={fld('pattern_class')}>
            {PATTERN_CLASSES.map(c => <option key={c} value={c}>{c.replace('card-pattern-', 'Pattern ')}</option>)}
          </select>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', marginTop:4 }}>
        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.25em', textTransform:'uppercase', color:'var(--adm-muted)', marginBottom:10 }}>Preview</div>
        <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:9, color:'var(--adm-dim)', marginBottom:4 }}>Nav pill</div>
            <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.7)', padding:'5px 14px', border:'1px solid rgba(255,255,255,0.15)', letterSpacing:'0.06em' }}>
              {form.label || '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize:9, color:'var(--adm-dim)', marginBottom:4 }}>Collection badge</div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, letterSpacing:'0.12em', color:'rgba(255,255,255,0.18)' }}>
              {form.hero_badge || '—'}
            </div>
          </div>
          <div style={{ flex:1, minWidth:120 }}>
            <div style={{ fontSize:9, color:'var(--adm-dim)', marginBottom:4 }}>Full name</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>{form.name || '—'}</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div>
      {/* Info banner */}
      <div style={{ padding:'12px 18px', background:'rgba(195,206,148,0.05)', border:'1px solid rgba(195,206,148,0.15)', marginBottom:20, fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>
        ℹ Changes update names, labels, and badges across the entire storefront. The 6 base categories (cat-1 to cat-6) can be edited or hidden but products assigned to them are preserved.
        Custom categories you add here will be available for product assignment immediately.
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:11, color:'var(--adm-muted)', letterSpacing:'0.05em' }}>
          {cats.length} categories · {cats.filter(c => !isBase(c.id)).length} custom
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {saved && <span style={{ fontSize:11, color:'var(--adm-sage)', letterSpacing:'0.1em' }}>✓ Saved</span>}
          <button className="adm-header-btn" onClick={resetAll}>Reset to Defaults</button>
          <button className="adm-header-btn adm-header-btn--primary" onClick={() => { setAdding(true); setForm(emptyForm()); setErrors({}); }}>
            + Add Category
          </button>
        </div>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>ID</th><th>Image</th><th>Full Name</th><th>Label</th><th>Badge</th><th>Type</th><th>Description</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cats.map(c => (
              <tr key={c.id}>
                <td className="muted" style={{ fontFamily:'monospace', fontSize:11 }}>{c.id}</td>
                <td>
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt={c.name} style={{ width:40, height:40, objectFit:'cover', border:'1px solid rgba(255,255,255,0.08)' }} />
                  ) : (
                    <div style={{ width:40, height:40, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'var(--adm-dim)', letterSpacing:'0.1em' }}>RE</div>
                  )}
                </td>
                <td style={{ fontWeight:600 }}>{c.name}</td>
                <td>
                  <span style={{ fontSize:11, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', padding:'3px 9px', letterSpacing:'0.05em' }}>
                    {c.label}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:15, letterSpacing:'0.1em', color:'rgba(255,255,255,0.5)' }}>
                    {c.hero_badge}
                  </span>
                </td>
                <td>
                  <span className={`adm-badge adm-badge--${isBase(c.id) ? 'active' : 'processing'}`}>
                    {isBase(c.id) ? 'Base' : 'Custom'}
                  </span>
                </td>
                <td className="muted" style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11 }}>
                  {c.description ?? '—'}
                </td>
                <td>
                  <div className="adm-actions">
                    <button className="adm-act-btn adm-act-btn--sage" onClick={() => openEdit(c)}>Edit</button>
                    {!isBase(c.id) && (
                      <button className="adm-act-btn adm-act-btn--red adm-act-btn--icon" onClick={() => setDeleting(c)} aria-label="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ ADD MODAL ═══ */}
      {adding && (
        <div className="adm-modal-backdrop" onClick={() => setAdding(false)}>
          <div className="adm-modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd">
              <span className="adm-modal-title">ADD NEW CATEGORY</span>
              <button className="adm-act-btn adm-act-btn--icon" onClick={() => setAdding(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="adm-modal-body"><FormFields /></div>
            <div className="adm-modal-footer">
              <button className="adm-header-btn" onClick={() => setAdding(false)}>Cancel</button>
              <button className="adm-header-btn adm-header-btn--primary" onClick={saveNew}>Create Category →</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {editing && (
        <div className="adm-modal-backdrop" onClick={() => setEditing(null)}>
          <div className="adm-modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd">
              <div>
                <span className="adm-modal-title">EDIT CATEGORY</span>
                <div style={{ fontSize:10, color:'var(--adm-muted)', marginTop:2, fontFamily:'monospace' }}>{editing.id}</div>
              </div>
              <button className="adm-act-btn adm-act-btn--icon" onClick={() => setEditing(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="adm-modal-body">
              {isBase(editing.id) && (
                <div style={{ padding:'8px 12px', background:'rgba(195,206,148,0.05)', border:'1px solid rgba(195,206,148,0.15)', marginBottom:14, fontSize:11, color:'rgba(255,255,255,0.4)' }}>
                  ℹ Base category — ID and slug are fixed. You can rename and restyle it freely.
                </div>
              )}
              <FormFields />
            </div>
            <div className="adm-modal-footer">
              <button className="adm-header-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="adm-header-btn adm-header-btn--primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRM ═══ */}
      {deleting && (
        <div className="adm-modal-backdrop" onClick={() => setDeleting(null)}>
          <div className="adm-modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-hd"><span className="adm-modal-title">DELETE CATEGORY</span></div>
            <div className="adm-modal-body">
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.8 }}>
                Delete <strong style={{ color:'var(--adm-text)' }}>{deleting.name}</strong>?
                <br />
                <span style={{ fontSize:11, color:'var(--adm-orange)' }}>
                  ⚠ Products assigned to this category will still exist but won&apos;t appear in this collection. Reassign them first.
                </span>
              </p>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-header-btn" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="adm-header-btn" style={{ background:'rgba(255,107,107,0.15)', borderColor:'rgba(255,107,107,0.4)', color:'var(--adm-red)' }} onClick={confirmDelete}>
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}