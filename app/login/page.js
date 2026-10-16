'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Form() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const next = useSearchParams().get('next') || '/';
  async function go(e) {
    e.preventDefault();
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (r.ok) location.href = next; else setErr('비밀번호가 맞지 않아요.');
  }
  return (
    <form onSubmit={go}>
      <p className="eyebrow">FP TV · Shorts Studio</p>
      <h1 className="head" style={{ fontSize: 34 }}>팀 입장</h1>
      <input className="field" type="password" autoFocus placeholder="팀 비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button className="btn dark">들어가기</button>
      {err && <p className="orange" style={{ margin: 0 }}>{err}</p>}
    </form>
  );
}
export default function Login() {
  return <div className="login"><Suspense><Form /></Suspense></div>;
}
