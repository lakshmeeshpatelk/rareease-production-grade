'use client';
import { useState, useRef, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';

interface Props { onAuth: () => void; }

export default function AdminLogin({ onAuth }: Props) {
  const login = useAdminStore(s => s.login);
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow]     = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const submit = async () => {
    if (!email.trim()) { setErr('Enter your admin email'); return; }
    if (!pw.trim())    { setErr('Enter your password'); return; }
    setLoading(true);
    setErr('');
    try {
      const ok = await login(email.trim(), pw);
      if (ok) {
        onAuth();
      } else {
        setErr('Incorrect credentials. Try again.');
        setPw('');
      }
    } catch {
      setErr('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-login-root">
      <div className="adm-login-card">
        <div className="adm-login-logo">RARE EASE</div>
        <div className="adm-login-sub">Admin Panel</div>
        {err && <div className="adm-login-error">{err}</div>}

        <div className="adm-field">
          <label className="adm-field-label">Email</label>
          <input
            ref={emailRef}
            type="email"
            className="adm-field-input"
            value={email}
            onChange={e => { setEmail(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="admin@rareease.com"
            autoComplete="email"
          />
        </div>

        <div className="adm-field">
          <label className="adm-field-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={show ? 'text' : 'password'}
              className="adm-field-input"
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Enter password"
              autoComplete="current-password"
            />
            <button
              onClick={() => setShow(p => !p)}
              style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',padding:'4px',display:'flex',alignItems:'center' }}
              type="button"
              tabIndex={-1}
            >
              {show
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </div>

        <button className="adm-login-btn" onClick={submit} disabled={loading}>
          {loading
            ? <><span style={{width:12,height:12,border:'2px solid rgba(0,0,0,0.2)',borderTopColor:'#000',borderRadius:'50%',animation:'spin 0.7s linear infinite',display:'inline-block'}}/> Verifying…</>
            : 'Enter Admin Panel →'}
        </button>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.2)',textAlign:'center',marginTop:20,letterSpacing:'0.05em'}}>
          This area is restricted to authorised Rare Ease team members.
        </p>
      </div>
    </div>
  );
}
