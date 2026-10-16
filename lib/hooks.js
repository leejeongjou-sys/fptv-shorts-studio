'use client';
import { useEffect, useState } from 'react';
import { subscribe } from './store';

export function useCol(col) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => subscribe(col, (a) => { setItems(a); setLoaded(true); }, (e) => setErr(e)), [col]);
  return [items, loaded, err];
}

export function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2600); return () => clearTimeout(t); }, [msg]);
  return [msg, setMsg];
}
