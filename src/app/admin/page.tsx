'use client';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminPage() {
  const { isAuthenticated, checkAuth, logout } = useAdminStore(s => ({
    isAuthenticated: s.isAuthenticated,
    checkAuth: s.checkAuth,
    logout: s.logout,
  }));
  const [checked, setChecked] = useState(false);

  // On mount, ask the server if a valid session cookie already exists.
  // This replaces the old sessionStorage read.
  useEffect(() => {
    (async () => {
      await checkAuth();
      setChecked(true);
    })();
  }, [checkAuth]);

  useEffect(() => {
    document.body.classList.add('is-admin');
    return () => document.body.classList.remove('is-admin');
  }, []);

  if (!checked) return null; // wait for session check before rendering either view

  if (!isAuthenticated) return <AdminLogin onAuth={() => useAdminStore.setState({ isAuthenticated: true })} />;
  return <AdminShell onLogout={logout} />;
}
