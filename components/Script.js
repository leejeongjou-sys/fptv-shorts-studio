'use client';
import { useEffect, useRef, useState } from 'react';
import { segments, fmt } from '@/lib/shorts';

// 전체 대본: 구간별로 나눠 보여 주고, selectable이면 드래그로 문장 고르기
//   드래그 = 더하기 · 노란 문장에서 시작한 드래그 = 빼기 · 노란 문장 클릭 = 빼기 · Shift+클릭 = 범위
export default function Script({ lf, selectable, sel, setSel, onCut, onRename }) {
  const L = lf.lines || [];
  const segs = segments(lf);
  const drag = useRef(null);
  const [hover, setHover] = useState(null);
  const last = useRef(null);

  useEffect(() => {
    const up = () => {
      if (!drag.current) return;
      const { a, b, mode, base } = drag.current;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const next = new Set(base);
      for (let k = lo; k <= hi; k++) mode === 'add' ? next.add(k) : next.delete(k);
      setSel(next);
      drag.current = null;
      setHover(null);
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [setSel]);

  function down(k, e) {
    if (!selectable) return;
    if (e.shiftKey && last.current != null) {
      const [lo, hi] = last.current < k ? [last.current, k] : [k, last.current];
      const next = new Set(sel);
      for (let i = lo; i <= hi; i++) next.add(i);
      setSel(next);
      return;
    }
    last.current = k;
    drag.current = { a: k, b: k, mode: sel.has(k) ? 'sub' : 'add', base: new Set(sel) };
    setHover([k, k]);
  }
  function enter(k) {
    if (!drag.current) return;
    drag.current.b = k;
    setHover([drag.current.a, k]);
  }
  const inHover = (k) => hover && k >= Math.min(...hover) && k <= Math.max(...hover);
  const painted = (k) => {
    if (inHover(k)) return drag.current?.mode === 'add';
    return sel?.has(k);
  };

  if (!L.length) return <div className="empty">아직 전체 대본이 없어요. PC 작업이 프로젝트 폴더를 읽고 올려 줘요.</div>;

  return (
    <div className="script" role="list">
      {segs.map((s, si) => {
        const dur = (L[s.to]?.[1] ?? 0) - (L[s.from]?.[0] ?? 0);
        return (
          <div key={si}>
            <div className="chap">
              <span
                contentEditable={!!onRename && s.title !== '도입' && s.title !== '전체'}
                suppressContentEditableWarning
                onBlur={(e) => onRename && onRename(s.from, e.currentTarget.innerText.trim())}
              >{s.title}</span>
              <span>{L.slice(s.from, s.to + 1).length}줄 · {fmt(dur)}</span>
            </div>
            {L.slice(s.from, s.to + 1).map((ln, j) => {
              const k = s.from + j;
              return (
                <div key={k} role="listitem" className={'ln' + (painted(k) ? ' sel' : '')}
                  onMouseDown={(e) => down(k, e)} onMouseEnter={() => enter(k)}
                  style={{ cursor: selectable ? 'pointer' : 'default' }}>
                  <span className="t">{fmt(ln[0])}</span>
                  <span>{ln[2]}</span>
                  {onCut && k > 0 && (
                    <button className="cut" onMouseDown={(e) => e.stopPropagation()} onClick={() => onCut(k)}>여기서 새 구간</button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
