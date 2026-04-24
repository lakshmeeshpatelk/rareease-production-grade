'use client';
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { CATEGORIES as STATIC_CATEGORIES } from '@/lib/categories';
import { formatPrice } from '@/lib/utils';
import type { Product, Variant } from '@/types';

const BADGES   = ['', 'Bestseller', 'New', 'Limited'] as const;
const SIZES    = ['S', 'M', 'L', 'XL', 'XXL'] as const;
const MAX_IMGS = 7;

type NewProductForm = {
  name: string; category_id: string; tagline: string; description: string;
  price: string; original_price: string; badge: string; is_featured: boolean;
  imagePreviews: string[];
};
type EditForm = {
  name: string; price: string; original_price: string; badge: string;
  tagline: string; description: string; is_active: boolean; is_featured: boolean; category_id: string;
  imagePreviews: string[];
};

const emptyForm = (): NewProductForm => ({
  name:'', category_id:'cat-1', tagline:'', description:'',
  price:'', original_price:'', badge:'', is_featured:false, imagePreviews:[],
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function buildProduct(form: NewProductForm, existingCount: number): Product {
  const pfx = ({'cat-1':'mos','cat-2':'wos','cat-3':'msl','cat-4':'wsl','cat-5':'mc','cat-6':'wc'} as Record<string,string>)[form.category_id] ?? 'prd';
  const id = `${pfx}-${String(existingCount+1).padStart(2,'0')}-${Date.now().toString(36)}`;
  const variants: Variant[] = SIZES.map((sz,i) => ({ id:`${id}-v${i+1}`, product_id:id, size:sz as Variant['size'], sku:`${id}-${sz}` }));
  const inventory = variants.map(v => ({ id:`inv-${v.id}`, variant_id:v.id, quantity:0, reserved:0 }));
  return {
    id, category_id:form.category_id, name:form.name.trim(), slug:slugify(form.name) ? `${slugify(form.name)}-${id.split('-').pop()}` : id,
    tagline:form.tagline.trim()||undefined, description:form.description.trim()||undefined,
    price:Number(form.price), original_price:form.original_price?Number(form.original_price):undefined,
    badge:form.badge||undefined, is_featured:form.is_featured, is_active:true,
    created_at:new Date().toISOString(), variants, inventory,
  };
}

function Err({ msg }: { msg: string }) {
  return <div style={{fontSize:11,color:'var(--adm-red)',marginTop:5}}>{msg}</div>;
}

const MultiImageUpload = memo(function MultiImageUpload({ previews, onChange, productId }: { previews:string[]; onChange:(u:string[])=>void; productId?:string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (f: File): Promise<string> => {
    if (!f.type.startsWith('image/')) throw new Error('Not an image');
    const formData = new FormData();
    formData.append('file', f);
    if (productId) formData.append('productId', productId);
    const res = await fetch('/api/admin/product-image', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error ?? 'Upload failed');
    }
    const { url } = await res.json();
    return url;
  };

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, MAX_IMGS - previews.length);
    setUploading(true);
    try {
      const urls = (await Promise.all(arr.map(uploadFile))).filter(Boolean);
      onChange([...previews, ...urls]);
    } catch (e) {
      alert(`Upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => onChange(previews.filter((_,idx) => idx !== i));
  const moveLeft = (i: number) => {
    if (i === 0) return;
    const n = [...previews]; [n[i-1],n[i]] = [n[i],n[i-1]]; onChange(n);
  };

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
        {previews.map((url,i) => (
          <div key={i} style={{position:'relative',aspectRatio:'1/1',borderRadius:4,overflow:'hidden',border:'1px solid rgba(255,255,255,0.15)'}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
            <div style={{position:'absolute',top:4,left:4,background:'rgba(0,0,0,0.65)',color:'rgba(255,255,255,0.8)',fontSize:9,fontWeight:700,width:15,height:15,borderRadius:2,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {i+1}
            </div>
            <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',opacity:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,transition:'opacity 0.15s'}}
              onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>
              {i > 0 && <button onClick={()=>moveLeft(i)} style={{background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.25)',color:'#fff',fontSize:9,padding:'2px 6px',cursor:'pointer',borderRadius:2}}>← Move left</button>}
              <button onClick={()=>remove(i)} style={{background:'rgba(220,50,50,0.25)',border:'1px solid rgba(220,50,50,0.5)',color:'#ff8080',fontSize:9,padding:'2px 6px',cursor:'pointer',borderRadius:2}}>Remove</button>
            </div>
          </div>
        ))}

        {previews.length < MAX_IMGS && (
          <div
            onClick={()=>!uploading && ref.current?.click()}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>{e.preventDefault();if(!uploading && e.dataTransfer.files.length)addFiles(e.dataTransfer.files);}}
            style={{aspectRatio:'1/1',border:'1px dashed rgba(255,255,255,0.12)',borderRadius:4,cursor:uploading?'not-allowed':'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,color:'rgba(255,255,255,0.22)',transition:'border-color 0.15s, background 0.15s'}}
            onMouseEnter={e=>{if(!uploading){e.currentTarget.style.borderColor='rgba(195,206,148,0.4)';e.currentTarget.style.background='rgba(195,206,148,0.04)';}}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.12)';e.currentTarget.style.background='transparent';}}
          >
            {uploading
              ? <div style={{fontSize:9,textAlign:'center',color:'var(--adm-sage)'}}>Uploading…</div>
              : <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  <div style={{fontSize:9,textAlign:'center',lineHeight:1.4}}>Add<br/>{previews.length}/{MAX_IMGS}</div>
                </>
            }
          </div>
        )}
      </div>

      <input ref={ref} type="file" accept="image/*" multiple style={{display:'none'}}
        onChange={e=>{if(e.target.files?.length)addFiles(e.target.files);e.target.value='';}} />

      <div style={{fontSize:9,color:'var(--adm-dim)',marginTop:6,lineHeight:1.5}}>
        Up to {MAX_IMGS} images · First image = main photo · Hover to reorder or remove · Drag &amp; drop supported
      </div>
    </div>
  );
});

const SEL: React.CSSProperties = {
  width:'100%', background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.12)',
  color:'#e8e6e0', fontFamily:'inherit', fontSize:13.5, padding:'11px 15px',
  outline:'none', borderRadius:4, cursor:'pointer', appearance:'none',
  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center',
};

export default function AdminProducts() {
  const { products, loadProducts, categories: dbCategories, loadCategories, toggleProductActive, updateProductPrice, updateProductBadge, addProduct, deleteProduct } = useAdminStore();
  const CATEGORIES = dbCategories.length > 0 ? dbCategories : STATIC_CATEGORIES;
  const [filter,   setFilter]   = useState('all');
  const [query,    setQuery]    = useState('');
  const [editing,  setEditing]  = useState<Product|null>(null);
  const [editForm, setEditForm] = useState<EditForm>({name:'',price:'',original_price:'',badge:'',tagline:'',description:'',is_active:true,is_featured:false,category_id:'cat-1',imagePreviews:[]});
  const [adding,   setAdding]   = useState(false);
  const [newForm,  setNewForm]  = useState<NewProductForm>(emptyForm());
  const [errors,   setErrors]   = useState<Partial<Record<string,string>>>({});
  const [deleting, setDeleting] = useState<Product|null>(null);
  const [saved,    setSaved]    = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { loadProducts(); loadCategories(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = products.filter(p => {
    const matchCat = filter==='all' || p.category_id===filter;
    const q = query.toLowerCase();
    return matchCat && (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  });

  const allSel = visible.length>0 && visible.every(p=>selected.has(p.id));
  const toggleSel = (id:string) => setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleAll = () => {
    if(allSel) setSelected(prev=>{const n=new Set(prev);visible.forEach(p=>n.delete(p.id));return n;});
    else setSelected(prev=>{const n=new Set(prev);visible.forEach(p=>n.add(p.id));return n;});
  };

  const bulkActive = async (a:boolean) => { await Promise.all(visible.filter(p=>selected.has(p.id)&&p.is_active!==a).map(p=>toggleProductActive(p.id)));setSelected(new Set());flashSaved(); };
  const bulkBadge  = async (b:string)  => { await Promise.all([...selected].map(id=>updateProductBadge(id,b)));setSelected(new Set());flashSaved(); };
  const bulkDel    = async ()          => { await Promise.all([...selected].map(id=>deleteProduct(id)));setSelected(new Set()); };

  const openEdit = (p:Product) => {
    setEditing(p);
    setEditForm({
      name:p.name, price:String(p.price), original_price:String(p.original_price??''),
      badge:p.badge??'', tagline:p.tagline??'', description:p.description??'',
      is_active:p.is_active, is_featured:p.is_featured, category_id:p.category_id,
      imagePreviews:(p.media??[]).sort((a,b)=>a.position-b.position).map(m=>m.url),
    });
  };

  const saveEdit = async () => {
    if(!editing) return;
    if(!editForm.name.trim() || !Number(editForm.price)) {
      useAdminStore.getState().showToast(!editForm.name.trim() ? 'Product name is required' : 'Enter a valid price', 'error');
      return;
    }
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          name: editForm.name.trim(),
          tagline: editForm.tagline.trim() || null,
          description: editForm.description.trim() || null,
          category_id: editForm.category_id,
          price: Number(editForm.price),
          original_price: editForm.original_price ? Number(editForm.original_price) : null,
          badge: editForm.badge || null,
          is_active: editForm.is_active,
          is_featured: editForm.is_featured,
          media: editForm.imagePreviews,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Save failed'); }
      useAdminStore.setState(s => ({
        products: s.products.map(p => p.id !== editing.id ? p : {
          ...p,
          name: editForm.name.trim(),
          tagline: editForm.tagline.trim() || undefined,
          description: editForm.description.trim() || undefined,
          category_id: editForm.category_id,
          price: Number(editForm.price),
          original_price: editForm.original_price ? Number(editForm.original_price) : undefined,
          badge: editForm.badge || undefined,
          is_active: editForm.is_active,
          is_featured: editForm.is_featured,
          media: editForm.imagePreviews.map((url, i) => ({ id: '', product_id: editing.id, url, type: 'image' as const, position: i })),
        }),
      }));
    } catch (e) {
      useAdminStore.getState().showToast(e instanceof Error ? e.message : 'Save failed', 'error');
      return;
    }
    setEditing(null); flashSaved();
  };

  const duplicate = async (p:Product) => {
    const nid=`${p.id}-copy-${Date.now().toString(36)}`;
    const variants:Variant[]=(p.variants??[]).map((v,i)=>({...v,id:`${nid}-v${i+1}`,product_id:nid,sku:`${nid}-${v.size}`}));
    const inventory=variants.map(v=>({id:`inv-${v.id}`,variant_id:v.id,quantity:10,reserved:0}));
    await addProduct({...p,id:nid,name:`${p.name} (Copy)`,slug:`${p.slug}-copy`,is_active:false,created_at:new Date().toISOString(),variants,inventory});
    flashSaved();
  };

  const validateNew = () => {
    const e: Record<string,string> = {};
    if(!newForm.name.trim()) e.name='Product name is required';
    if(!newForm.price||Number(newForm.price)<=0) e.price='Enter a valid price';
    if(newForm.original_price&&Number(newForm.original_price)<=Number(newForm.price)) e.original_price='Original price must be higher than sale price';
    setErrors(e);return Object.keys(e).length===0;
  };

  const saveNew = async () => {
    if(!validateNew()) return;
    const product = buildProduct(newForm, products.filter(p=>p.category_id===newForm.category_id).length);
    product.media = newForm.imagePreviews.map((url, i) => ({
      id: '', product_id: product.id, url, type: 'image' as const, position: i,
    }));
    await addProduct(product);
    await loadProducts();
    setAdding(false);setNewForm(emptyForm());setErrors({});flashSaved();
  };

  const ef = useCallback(
    (k: keyof EditForm) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setEditForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value })),
    []
  );

  const flashSaved = useCallback(() => {
    setSaved(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  const confirmDel = async () => { if(deleting){await deleteProduct(deleting.id);setDeleting(null);} };
  const catLabel   = (id:string) => CATEGORIES.find(c=>c.id===id)?.label??id;

  const nf = useCallback(
    (k: keyof NewProductForm) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setNewForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value })),
    []
  );

  return (
    <div>
      {saved && (
        <div style={{position:'fixed',top:20,right:20,zIndex:9999,background:'rgba(195,206,148,0.15)',border:'1px solid rgba(195,206,148,0.4)',color:'var(--adm-sage)',fontSize:12,fontWeight:700,letterSpacing:'0.15em',padding:'10px 18px'}}>
          ✓ SAVED
        </div>
      )}

      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <span className="adm-search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></span>
          <input className="adm-search-input" placeholder="Search products…" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false} />
        </div>
        <select style={{...SEL,width:'auto',minWidth:160,padding:'8px 36px 8px 12px'}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="adm-header-btn adm-header-btn--primary" style={{marginLeft:'auto'}} onClick={()=>{setAdding(true);setNewForm(emptyForm());setErrors({});}}>
          + Add Product
        </button>
      </div>

      {selected.size>0 && (
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:'rgba(195,206,148,0.07)',border:'1px solid rgba(195,206,148,0.2)',marginBottom:12}}>
          <span style={{fontSize:11,fontWeight:700,color:'var(--adm-sage)',letterSpacing:'0.1em'}}>{selected.size} selected</span>
          <div style={{width:1,height:16,background:'rgba(255,255,255,0.1)'}} />
          <button className="adm-act-btn adm-act-btn--sage" onClick={()=>bulkActive(true)}>Show All</button>
          <button className="adm-act-btn" onClick={()=>bulkActive(false)}>Hide All</button>
          <select style={{...SEL,width:'auto',padding:'5px 32px 5px 10px',fontSize:11}} defaultValue=""
            onChange={e=>{if(e.target.value!==''){bulkBadge(e.target.value);(e.target as HTMLSelectElement).value='';}}}> 
            <option value="">Set Badge…</option>
            <option value="">None</option>
            {['Bestseller','New','Limited'].map(b=><option key={b} value={b}>{b}</option>)}
          </select>
          <button className="adm-act-btn adm-act-btn--red" onClick={()=>{if(window.confirm(`Delete ${selected.size} products?`))bulkDel();}}>Delete</button>
          <button className="adm-act-btn" style={{marginLeft:'auto'}} onClick={()=>setSelected(new Set())}>✕ Clear</button>
        </div>
      )}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{width:40}}><input type="checkbox" checked={allSel} onChange={toggleAll} style={{accentColor:'var(--adm-sage)',width:14,height:14,cursor:'pointer'}} /></th>
              <th>ID</th><th>Product Name</th><th>Category</th><th>Price</th><th>Original</th><th>Badge</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length===0 && <tr><td colSpan={9} style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.2)'}}>No products found</td></tr>}
            {visible.map(p=>(
              <tr key={p.id} style={{background:selected.has(p.id)?'rgba(195,206,148,0.04)':undefined}}>
                <td><input type="checkbox" checked={selected.has(p.id)} onChange={()=>toggleSel(p.id)} style={{accentColor:'var(--adm-sage)',width:14,height:14,cursor:'pointer'}} /></td>
                <td className="muted" style={{fontFamily:'monospace',fontSize:11}}>{p.id}</td>
                <td>
                  <div style={{fontWeight:600}}>{p.name}</div>
                  {p.tagline&&<div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2}}>{p.tagline}</div>}
                </td>
                <td className="muted">{catLabel(p.category_id)}</td>
                <td><span style={{fontFamily:'Bebas Neue,sans-serif',fontSize:15,letterSpacing:'0.04em'}}>{formatPrice(p.price)}</span></td>
                <td className="muted">{p.original_price?formatPrice(p.original_price):'—'}</td>
                <td>{p.badge?<span className={`adm-badge adm-badge--${p.badge.toLowerCase()}`}>{p.badge}</span>:<span className="muted">—</span>}</td>
                <td><span className={`adm-badge adm-badge--${p.is_active?'active':'inactive'}`}>{p.is_active?'Active':'Hidden'}</span></td>
                <td>
                  <div className="adm-actions">
                    <button className="adm-act-btn adm-act-btn--sage" onClick={()=>openEdit(p)}>Edit</button>
                    <button className="adm-act-btn" onClick={()=>toggleProductActive(p.id)}>{p.is_active?'Hide':'Show'}</button>
                    <button className="adm-act-btn" title="Duplicate" onClick={()=>duplicate(p)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button className="adm-act-btn adm-act-btn--red adm-act-btn--icon" onClick={()=>setDeleting(p)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="adm-modal-backdrop" onClick={()=>setAdding(false)}>
          <div className="adm-modal" style={{maxWidth:660}} onClick={e=>e.stopPropagation()}>
            <div className="adm-modal-hd">
              <span className="adm-modal-title">ADD NEW PRODUCT</span>
              <button className="adm-act-btn adm-act-btn--icon" onClick={()=>setAdding(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label className="adm-field-label">Product Images <span style={{color:'rgba(255,255,255,0.3)',fontSize:10,fontWeight:400}}>up to {MAX_IMGS}</span></label>
                <MultiImageUpload previews={newForm.imagePreviews} onChange={urls=>setNewForm(p=>({...p,imagePreviews:urls}))} />
              </div>
              <div className="adm-field-row" style={{marginTop:4}}>
                <div className="adm-field">
                  <label className="adm-field-label">Category <span style={{color:'var(--adm-red)'}}>*</span></label>
                  <select style={SEL} value={newForm.category_id} onChange={nf('category_id')}>
                    {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-field-label">Product Name <span style={{color:'var(--adm-red)'}}>*</span></label>
                  <input className="adm-field-input" value={newForm.name} onChange={nf('name')} placeholder="e.g. Minimal Drop Tee"
                    autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false} />
                  {errors.name&&<Err msg={errors.name} />}
                </div>
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Tagline</label>
                <input className="adm-field-input" value={newForm.tagline} onChange={nf('tagline')} placeholder="Short one-liner"
                  autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Description</label>
                <textarea className="adm-field-textarea" value={newForm.description} onChange={nf('description')} rows={3} placeholder="Product description…"
                  autoComplete="off" spellCheck={false} />
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label className="adm-field-label">Selling Price (₹) <span style={{color:'var(--adm-red)'}}>*</span></label>
                  <input type="number" inputMode="decimal" className="adm-field-input" value={newForm.price} onChange={nf('price')} placeholder="2499" autoComplete="off" />
                  {errors.price&&<Err msg={errors.price} />}
                </div>
                <div className="adm-field">
                  <label className="adm-field-label">Original Price (₹) <span style={{fontSize:9,color:'var(--adm-dim)'}}>if on sale</span></label>
                  <input type="number" inputMode="decimal" className="adm-field-input" value={newForm.original_price} onChange={nf('original_price')} placeholder="2999" autoComplete="off" />
                  {errors.original_price&&<Err msg={errors.original_price} />}
                </div>
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label className="adm-field-label">Badge</label>
                  <select style={SEL} value={newForm.badge} onChange={nf('badge')}>
                    {BADGES.map(b=><option key={b} value={b}>{b||'None'}</option>)}
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-field-label">Featured</label>
                  <div style={{display:'flex',alignItems:'center',gap:12,paddingTop:10}}>
                    <label style={{position:'relative',width:36,height:20,cursor:'pointer',flexShrink:0}}>
                      <input type="checkbox" checked={newForm.is_featured} onChange={nf('is_featured')} style={{display:'none'}} />
                      <div style={{position:'absolute',inset:0,background:newForm.is_featured?'rgba(195,206,148,0.2)':'rgba(255,255,255,0.1)',border:`1px solid ${newForm.is_featured?'rgba(195,206,148,0.4)':'var(--adm-border)'}`,borderRadius:2}} />
                      <div style={{position:'absolute',top:3,left:newForm.is_featured?19:3,width:12,height:12,background:newForm.is_featured?'var(--adm-sage)':'var(--adm-muted)',transition:'left 0.2s'}} />
                    </label>
                    <span style={{fontSize:11,color:'var(--adm-muted)'}}>{newForm.is_featured?'Yes':'No'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <span style={{fontSize:11,color:'var(--adm-muted)'}}>Stock defaults to 0 — set quantities in Inventory after saving.</span>
              <button className="adm-header-btn" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="adm-header-btn adm-header-btn--primary" onClick={saveNew}>Add Product →</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="adm-modal-backdrop" onClick={()=>setEditing(null)}>
          <div className="adm-modal" style={{maxWidth:620}} onClick={e=>e.stopPropagation()}>
            <div className="adm-modal-hd">
              <div>
                <span className="adm-modal-title">EDIT PRODUCT</span>
                <div style={{fontSize:10,color:'var(--adm-muted)',marginTop:2,fontFamily:'monospace'}}>{editing.id}</div>
              </div>
              <button className="adm-act-btn adm-act-btn--icon" onClick={()=>setEditing(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-field">
                <label className="adm-field-label">Product Images <span style={{color:'rgba(255,255,255,0.3)',fontSize:10,fontWeight:400}}>up to {MAX_IMGS}</span></label>
                <MultiImageUpload previews={editForm.imagePreviews} onChange={urls=>setEditForm(p=>({...p,imagePreviews:urls}))} productId={editing?.id} />
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Category</label>
                <select style={SEL} value={editForm.category_id} onChange={ef('category_id')}>
                  {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Product Name</label>
                <input className="adm-field-input" value={editForm.name} onChange={ef('name')}
                  autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false} />
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Tagline</label>
                <input className="adm-field-input" value={editForm.tagline} onChange={ef('tagline')}
                  autoComplete="off" autoCorrect="off" spellCheck={false} />
              </div>
              <div className="adm-field">
                <label className="adm-field-label">Description</label>
                <textarea className="adm-field-textarea" value={editForm.description} onChange={ef('description')} rows={3}
                  autoComplete="off" spellCheck={false} />
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label className="adm-field-label">Selling Price (₹)</label>
                  <input type="number" inputMode="decimal" className="adm-field-input" value={editForm.price} onChange={ef('price')} autoComplete="off" />
                </div>
                <div className="adm-field">
                  <label className="adm-field-label">Original Price (₹)</label>
                  <input type="number" inputMode="decimal" className="adm-field-input" value={editForm.original_price} placeholder="Leave blank if not on sale" onChange={ef('original_price')} autoComplete="off" />
                </div>
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label className="adm-field-label">Badge</label>
                  <select style={SEL} value={editForm.badge} onChange={ef('badge')}>
                    {BADGES.map(b=><option key={b} value={b}>{b||'None'}</option>)}
                  </select>
                </div>
                <div className="adm-field">
                  <label className="adm-field-label">Visibility</label>
                  <select style={SEL} value={String(editForm.is_active)} onChange={ef('is_active')}>
                    <option value="true">Active</option>
                    <option value="false">Hidden</option>
                  </select>
                </div>
              </div>
              <div className="adm-field-row">
                <div className="adm-field">
                  <label className="adm-field-label">Featured</label>
                  <select style={SEL} value={String(editForm.is_featured)} onChange={ef('is_featured')}>
                    <option value="true">Yes — show in Top Sellers</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-header-btn" onClick={()=>setEditing(null)}>Cancel</button>
              <button className="adm-header-btn adm-header-btn--primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="adm-modal-backdrop" onClick={()=>setDeleting(null)}>
          <div className="adm-modal" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div className="adm-modal-hd"><span className="adm-modal-title">DELETE PRODUCT</span></div>
            <div className="adm-modal-body">
              <p style={{fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.7}}>
                Delete <strong style={{color:'var(--adm-text)'}}>{deleting.name}</strong>?<br/>
                <span style={{fontSize:11,color:'var(--adm-muted)'}}>This cannot be undone.</span>
              </p>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-header-btn" onClick={()=>setDeleting(null)}>Cancel</button>
              <button className="adm-header-btn" style={{background:'rgba(255,107,107,0.15)',borderColor:'rgba(255,107,107,0.4)',color:'var(--adm-red)'}} onClick={confirmDel}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}