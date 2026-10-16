'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { mode } from '@/lib/store';

const NAV = [
  { href: '/', label: '현황', word: 'studio' },
  { href: '/shorts', label: '쇼츠 만들기', word: 'shorts' },
  { href: '/map/longform', label: '롱폼 → 쇼츠 마인드맵', word: 'mind map' },
  { href: '/map/magazine', label: '매거진 에디터 업무 지도', word: 'magazine' },
];

export default function Shell({ children }) {
  const path = usePathname() || '/';
  const [date, setDate] = useState('');
  useEffect(() => {
    const d = new Date();
    setDate(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`);
  }, []);
  if (path.startsWith('/login')) return children;
  const cur = NAV.slice().reverse().find((n) => (n.href === '/' ? path === '/' : path.startsWith(n.href))) || NAV[0];
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="mark" aria-label="FP TV 홈">FP</Link>
        <span className={'word' + (cur.word.length > 7 ? ' small' : '')} aria-hidden="true">{cur.word}</span>
      </aside>
      <div className="main">
        <header className="top">
          <nav className="nav" aria-label="메뉴">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={n === cur ? 'on' : ''}>{n.label}</Link>
            ))}
          </nav>
          <div className="meta">
            <div>FP TV · Shorts Studio</div>
            <div>{date || '\u00a0'}</div>
            <u>{mode === 'firebase' ? '팀 저장소 연결됨' : '이 브라우저에만 저장 중'}</u>
          </div>
        </header>
        <main className="page">{children}</main>
        <footer className="foot">
          <span>페플TV 쇼츠 스튜디오</span>
          <span>FMJ International · V미디어팀</span>
        </footer>
      </div>
    </div>
  );
}
