'use client';
// 저장소: Firebase 환경변수가 있으면 Firestore(팀 공유·실시간), 없으면 이 브라우저 localStorage(체험용)
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, writeBatch,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const mode = cfg.apiKey && cfg.projectId ? 'firebase' : 'local';
const PREFIX = process.env.NEXT_PUBLIC_COLLECTION_PREFIX || '';

let fs = null;
let authReady = null;
function fire() {
  if (fs) return fs;
  const app = getApps()[0] || initializeApp(cfg);
  fs = getFirestore(app);
  const auth = getAuth(app);
  authReady = new Promise((res) => {
    const off = onAuthStateChanged(auth, (u) => {
      if (u) { off(); res(u); }
    });
    signInAnonymously(auth).catch((e) => { console.warn('anon auth', e); res(null); });
  });
  return fs;
}

// ---------- local fallback ----------
const subs = new Map(); // col -> Set(cb)
function lget(col) {
  try { return JSON.parse(localStorage.getItem('fptv:' + col) || '{}'); } catch { return {}; }
}
function lput(col, obj) {
  try { localStorage.setItem('fptv:' + col, JSON.stringify(obj)); } catch {}
  const arr = Object.entries(obj).map(([id, d]) => ({ id, ...d }));
  (subs.get(col) || []).forEach((cb) => cb(arr));
}

export function who() {
  try {
    let n = localStorage.getItem('fptv:name');
    return n || '';
  } catch { return ''; }
}
export function setWho(n) { try { localStorage.setItem('fptv:name', n); } catch {} }

export function subscribe(col, cb, onErr) {
  if (mode === 'local') {
    if (!subs.has(col)) subs.set(col, new Set());
    subs.get(col).add(cb);
    const obj = lget(col);
    setTimeout(() => cb(Object.entries(obj).map(([id, d]) => ({ id, ...d }))), 0);
    return () => subs.get(col).delete(cb);
  }
  const db = fire();
  let off = () => {};
  let dead = false;
  authReady.then(() => {
    if (dead) return;
    off = onSnapshot(
      collection(db, PREFIX + col),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => { console.error(col, e); onErr && onErr(e); },
    );
  });
  return () => { dead = true; off(); };
}

export async function put(col, id, data) {
  if (mode === 'local') { const o = lget(col); o[id] = data; lput(col, o); return; }
  const db = fire(); await authReady;
  await setDoc(doc(db, PREFIX + col, id), data);
}
export async function patch(col, id, data) {
  if (mode === 'local') { const o = lget(col); o[id] = { ...(o[id] || {}), ...data }; lput(col, o); return; }
  const db = fire(); await authReady;
  await updateDoc(doc(db, PREFIX + col, id), data);
}
export async function remove(col, id) {
  if (mode === 'local') { const o = lget(col); delete o[id]; lput(col, o); return; }
  const db = fire(); await authReady;
  await deleteDoc(doc(db, PREFIX + col, id));
}
export async function putMany(col, items) {
  if (mode === 'local') { const o = lget(col); items.forEach((it) => { const { id, ...d } = it; o[id] = d; }); lput(col, o); return; }
  const db = fire(); await authReady;
  for (let i = 0; i < items.length; i += 400) {
    const b = writeBatch(db);
    items.slice(i, i + 400).forEach((it) => { const { id, ...d } = it; b.set(doc(db, PREFIX + col, id), d); });
    await b.commit();
  }
}
export async function count(col) {
  if (mode === 'local') return Object.keys(lget(col)).length;
  const db = fire(); await authReady;
  return (await getDocs(collection(db, PREFIX + col))).size;
}

export const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
