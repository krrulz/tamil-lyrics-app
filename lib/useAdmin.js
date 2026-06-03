// lib/useAdmin.js — client-side admin auth hook
import { useState, useEffect, useCallback } from 'react';

export function useAdminAuth() {
  const [auth, setAuth] = useState(null); // { user, token }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;
    (async () => {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      if (!getApps().length) {
        initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
      const firebaseAuth = getAuth();
      unsub = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          setAuth({ user, token });
        } else {
          setAuth(null);
        }
        setLoading(false);
      });
    })();
    return () => unsub?.();
  }, []);

  const apiFetch = useCallback(async (url, opts = {}) => {
    const { getAuth } = await import('firebase/auth');
    const firebaseAuth = getAuth();
    const token = await firebaseAuth.currentUser?.getIdToken();
    return fetch(url, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
  }, []);

  return { auth, loading, apiFetch };
}
