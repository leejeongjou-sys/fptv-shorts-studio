'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCol, useToast } from '@/lib/hooks';
import { put, patch, putMany, remove, who, setWho } from '@/lib/store';
import Script from '@/components/Script';
import ShortCard from '@/components/ShortCard';
import { segments, recommend, nextNo, pickLines, nsp, estSec, fmt, CAP, SAMPLE_LF, STATUS_CLASS } from '@/lib/shorts';

const MODES = [
  { k: '요약', t: '① 요약', d: '90초 이내 한 편 · 나레이션 + 월터 음성' },
  { k: '개별', t: '② 개별', d: '구간(챕터)마다 한 편 · 원본 음성' },
  { k: '드래그', t: '③ 드래그', d: '문장을 직접 끌어 골라 한 편 · 원본 음성' },
];

export default function ShortsPage() {
  const [lfs, lfLoaded, err] = useCol('longform');
  const [shorts] = useCol('shorts');
  const [msg, toast] = useToast();
  const [cur, setCur] = useState(null);
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  useEffect(() => setName(who()), []);

  const list = useMemo(() => [...lfs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)), [lfs]);
  const lf = list.find((x) => x.id === cur) || list[0];
  useEffect(() => { if (lf && !cur) setCur(lf.id); }, [lf, cur]);
  const rec = lf ? recommend(lf) : null;
  const m = mode || lf?.mode || rec?.pick || '드래그';
  const mine = shorts.filter((s) => lf && s.project === lf.project).sort((a, b) => String(a.no).localeCompare(String(b.no)));

  async function chooseMode(k) {
    setMode(k);
    if (lf) patch('longform', lf.id, { mode: k }).catch(() => {});
  }

  return (
    <>
      <p className="eyebrow">Shorts Studio</p>
      <h1 className="head">롱폼 → 쇼츠 만들기</h1>
      <p className="lede">
        전체 대본을 먼저 읽고, 요약·개별·드래그 중 골라 쇼츠 대본을 만들어요. 대본을 <b>확정</b>하면 PC 예약 작업(매시 29분)이 가져가서 영상을 만들고, 완성되면 여기서 바로 볼 수 있어요.
      </p>
      <div className="acts" style={{ marginBottom: 18 }}>
        <label className="muted" style={{ fontSize: 13 }}>작성자</label>
        <input className="field" style={{ width: 140 }} value={name} placeholder="이름"
          onChange={(e) => setName(e.target.value)} onBlur={() => setWho(name.trim())} />
        <ImportJson toast={toast} />
      </div>
      {err && <div className="banner">저장소를 읽지 못했어요: {err.message}</div>}

      {lfLoaded && !list.length ? (
        <div className="empty">
          <p style={{ margin: '0 0 12px' }}>아직 올라온 롱폼이 없어요. PC 작업이 프로젝트 폴더의 전체 대본을 올리면 여기에 나타나요.</p>
          <button className="btn dark" onClick={() => put('longform', SAMPLE_LF.id, { ...SAMPLE_LF, createdAt: Date.now() })}>예시 롱폼으로 둘러보기</button>
        </div>
      ) : (
        <div className="studio">
          <aside>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Longform</p>
            {list.map((x) => {
              const n = shorts.filter((s) => s.project === x.project);
              const done = n.filter((s) => s.status === '완료').length;
              return (
                <button key={x.id} className={'lfitem' + (x.id === lf?.id ? ' on' : '')} onClick={() => { setCur(x.id); setMode(null); }}>
                  <b>{x.title || x.project}</b>
                  <small>{x.project}{n.length ? ` · 쇼츠 ${n.length}편 중 ${done}편 완료` : ' · 쇼츠 없음'}</small>
                </button>
              );
            })}
          </aside>
          {lf && (
            <section>
              <div className="acts" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ font: '600 26px/1.2 var(--display)', color: 'var(--ink)', margin: 0 }}>{lf.title || lf.project}</h2>
                  <div className="muted" style={{ fontSize: 12.5, wordBreak: 'break-all' }}>
                    {lf.folder}{lf.issue ? ` · 이슈: ${lf.issue}` : ''} · {(lf.lines || []).length}줄 · {fmt((lf.lines || []).at(-1)?.[1] || 0)}
                  </div>
                </div>
                {lf.sample && (
                  <button className="btn ghost sm" onClick={async () => {
                    await remove('longform', lf.id);
                    for (const s of mine) await remove('shorts', s.id);
                    setCur(null);
                  }}>예시 지우기</button>
                )}
              </div>

              <p className="eyebrow" style={{ marginTop: 22 }}>1 · 전체 대본 읽고 갈래 고르기</p>
              <div className="modes" role="tablist">
                {MODES.map((o) => (
                  <button key={o.k} role="tab" aria-selected={m === o.k} className={m === o.k ? 'on' : ''} onClick={() => chooseMode(o.k)}>
                    <b>{o.t} {rec?.pick === o.k && <span className="tag o" style={{ verticalAlign: 3 }}>추천</span>}</b>
                    <small>{o.d}</small>
                  </button>
                ))}
              </div>
              {rec && <p className="rec">Claude 추천 · {rec.pick === '요약' ? '① 요약' : '② 개별'} — {rec.why}</p>}

              {m === '드래그' && <DragMode lf={lf} shorts={shorts} toast={toast} />}
              {m === '개별' && <EachMode lf={lf} shorts={shorts} toast={toast} />}
              {m === '요약' && <SummaryMode lf={lf} shorts={shorts} toast={toast} />}

              <hr className="rule ink" />
              <div className="acts" style={{ justifyContent: 'space-between' }}>
                <p className="eyebrow" style={{ margin: 0 }}>2 · 쇼츠 대본 검토 → 확정 ({mine.length}편)</p>
                <span className="acts" style={{ gap: 6 }}>
                  {['대본 검토', '대본 수정됨', '확정', '제작 중', '완료'].map((st) => {
                    const c = mine.filter((s) => s.status === st).length;
                    return c ? <span key={st} className={'pill ' + STATUS_CLASS[st]}>{st} {c}</span> : null;
                  })}
                </span>
              </div>
              <div className="shorts">
                {mine.length ? mine.map((s) => <ShortCard key={s.id} s={s} toast={toast} />)
                  : <div className="empty">위에서 쇼츠를 만들면 여기에 대본 카드가 생겨요.</div>}
              </div>
            </section>
          )}
        </div>
      )}
      {msg && <div className="toast" role="status">{msg}</div>}
    </>
  );
}

function mkShort(lf, shorts, { title, kind, lines, note, seg, no: forceNo }) {
  const no = forceNo || nextNo(shorts, lf.project);
  const id = `${lf.id.replace(/^lf-/, '')}-${no}-${Date.now().toString(36)}`;
  const now = Date.now();
  const me = who() || '팀원';
  return put('shorts', id, {
    project: lf.project, folder: lf.folder || '', issue: lf.issue || '', no, title, status: '대본 검토', kind, lines,
    note: note || '', ...(seg != null ? { seg } : {}), createdAt: now, updatedAt: now, createdBy: me, updatedBy: me,
  });
}

function DragMode({ lf, shorts, toast }) {
  const [sel, setSel] = useState(new Set());
  const [title, setTitle] = useState('');
  const L = lf.lines || [];
  useEffect(() => { setSel(new Set()); setTitle(''); }, [lf.id]);
  const ks = [...sel].sort((a, b) => a - b);
  const dur = ks.reduce((a, k) => a + (L[k][1] - L[k][0]), 0);
  const segs = ks.filter((k, i) => i === 0 || ks[i - 1] !== k - 1).length;

  async function make() {
    const t = title.trim();
    if (!t) return toast('쇼츠 제목을 적어 주세요 (15자 안).');
    if (nsp(t) > 15) return toast('제목은 띄어쓰기 빼고 15자 안으로 맞춰 주세요.');
    await mkShort(lf, shorts, { title: t, kind: '드래그', lines: pickLines(L, ks), note: `전체 대본에서 직접 고른 ${segs}구간` });
    setSel(new Set()); setTitle('');
    toast('쇼츠 대본을 만들었어요. 아래에서 검토하고 확정해 주세요.');
  }

  return (
    <>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 8px' }}>
        문장을 끌어서 고르세요. 여러 번 끌면 구간이 합쳐지고, 노란 문장에서 시작해 끌거나 클릭하면 빠져요. Shift+클릭은 범위 선택. 원래 순서대로 이어 붙여요.
      </p>
      <div style={{ position: 'relative' }}>
        <Script lf={lf} selectable sel={sel} setSel={setSel} />
        {ks.length > 0 && (
          <div className="selbar">
            <b>{ks.length}줄 · {segs}구간 · 약 {fmt(dur)}</b>
            {dur > 90 && <span style={{ color: '#f2b38a', fontSize: 12 }}>90초 넘어요</span>}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="쇼츠 제목 (15자 안)" onKeyDown={(e) => e.key === 'Enter' && make()} />
            <button className="btn" style={{ background: 'var(--paper)' }} onClick={make}>쇼츠 만들기</button>
            <button className="btn sm" style={{ color: 'var(--paper)', borderColor: '#666' }} onClick={() => setSel(new Set())}>선택 지우기</button>
          </div>
        )}
      </div>
    </>
  );
}

function EachMode({ lf, shorts, toast }) {
  const L = lf.lines || [];
  const segs = segments(lf).filter((s) => s.title !== '도입');
  const made = new Set(shorts.filter((s) => s.project === lf.project && s.kind === '개별').map((s) => s.seg));

  async function cut(k) {
    const ch = [...(lf.chapters || []).filter((c) => c.k !== k), { k, title: '' }].sort((a, b) => a.k - b.k);
    await patch('longform', lf.id, { chapters: ch.map((c, i) => ({ ...c, title: c.title || `${i + 1}. 새 구간` })) });
  }
  async function rename(k, t) {
    const ch = (lf.chapters || []).map((c) => (c.k === k ? { ...c, title: t } : c));
    await patch('longform', lf.id, { chapters: ch });
  }
  async function makeSeg(s) {
    const ks = []; for (let k = s.from; k <= s.to; k++) ks.push(k);
    const lines = ks.map((k) => ({ id: Number(L[k][0]).toFixed(2), t0: L[k][0], t1: L[k][1], text: L[k][2], on: true, ctx: false }));
    await mkShort(lf, shorts, { title: s.title.replace(/^\d+\.\s*/, '').slice(0, 15), kind: '개별', lines, note: `구간 '${s.title}' 원본 대사`, seg: s.from });
  }
  async function makeAll() {
    // 아직 안 만든 구간만, 번호가 겹치지 않게 차례로
    const todo = segs.filter((s) => !made.has(s.from));
    let n = parseInt(nextNo(shorts, lf.project), 10);
    for (const s of todo) {
      const ks = []; for (let k = s.from; k <= s.to; k++) ks.push(k);
      const lines = ks.map((k) => ({ id: Number(L[k][0]).toFixed(2), t0: L[k][0], t1: L[k][1], text: L[k][2], on: true, ctx: false }));
      await mkShort(lf, shorts, { no: String(n++).padStart(2, '0'), title: s.title.replace(/^\d+\.\s*/, '').slice(0, 15), kind: '개별', lines, note: `구간 '${s.title}' 원본 대사`, seg: s.from });
    }
    toast(todo.length ? `구간 ${todo.length}개를 쇼츠 대본으로 만들었어요.` : '모든 구간이 이미 쇼츠로 만들어져 있어요.');
  }

  return (
    <>
      <div className="thead" style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 70px 120px', marginTop: 6 }}>
        <span>구간</span><span>줄</span><span>길이</span><span />
      </div>
      {segs.map((s) => {
        const d = (L[s.to]?.[1] ?? 0) - (L[s.from]?.[0] ?? 0);
        return (
          <div key={s.from} className="row" style={{ gridTemplateColumns: 'minmax(0,1fr) 70px 70px 120px' }}>
            <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{s.title}</span>
            <span>{s.to - s.from + 1}</span>
            <span className={d < 30 || d > 75 ? 'orange' : ''}>{fmt(d)}</span>
            <button className="btn sm dark" onClick={async () => { await makeSeg(s); toast(`'${s.title}' 쇼츠 대본을 만들었어요.`); }}>쇼츠 만들기</button>
          </div>
        );
      })}
      <div className="acts" style={{ margin: '12px 0 18px' }}>
        <button className="btn" onClick={makeAll} disabled={!segs.length}>모든 구간 한 번에</button>
        <span className="muted" style={{ fontSize: 12.5 }}>구간이 안 맞으면 아래 대본에서 줄에 마우스를 올리고 ‘여기서 새 구간’을 누르세요. 구간 이름은 검은 띠에서 바로 고쳐요.</span>
      </div>
      <Script lf={lf} onCut={cut} onRename={rename} />
    </>
  );
}

function SummaryMode({ lf, shorts, toast }) {
  const n = lf.narration || {};
  const [dir, setDir] = useState(n.direction || '');
  const [text, setText] = useState(n.text || '');
  const [target, setTarget] = useState(n.target || 60);
  const dirty = useRef(false);
  useEffect(() => {
    if (dirty.current) return;
    setDir(n.direction || ''); setText(n.text || ''); setTarget(n.target || 60);
  }, [lf.id, n.text, n.direction, n.target]);

  const rows = text.split('\n').map((t) => t.trim()).filter(Boolean);
  const over = rows.filter((r) => nsp(r) > CAP + 2).length;
  const sec = estSec(rows.join(''));
  const me = who() || '팀원';

  async function save(extra = {}, msg) {
    await patch('longform', lf.id, { narration: { ...n, direction: dir, text, target: Number(target) || 60, ...extra, updatedAt: Date.now(), updatedBy: me } });
    dirty.current = false;
    msg && toast(msg);
  }

  return (
    <>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
        구간 요약을 먼저 보고 구성 방향을 정하면, PC 작업이 나레이션 초안을 써서 아래 칸에 넣어요. 한 줄이 자막 한 컷이에요(18자 안팎, 첫 줄은 훅).
      </p>
      {n.summary && (
        <div className="row" style={{ display: 'block', marginBottom: 14 }}>
          <b style={{ fontSize: 12, letterSpacing: '.08em' }}>구간 요약</b>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{n.summary}</div>
        </div>
      )}
      <label className="muted" style={{ fontSize: 12.5 }}>구성 방향</label>
      <div className="acts" style={{ marginBottom: 14 }}>
        <input className="field" style={{ flex: '1 1 300px', width: 'auto' }} value={dir}
          placeholder="예: 60초 ±5초, 브랜드+상품명, 화면에 가격, 1.1배속"
          onChange={(e) => { dirty.current = true; setDir(e.target.value); }} />
        <button className="btn dark" onClick={() => save({ req: { at: Date.now(), by: me, direction: dir }, status: '요약 요청' }, '요청했어요. 다음 작업 때 나레이션 초안이 들어와요.')}>
          {n.text ? '나레이션 다시 써 달라기' : '나레이션 초안 요청'}
        </button>
        {n.status && <span className={'pill ' + (n.status === '요약 요청' ? 's-run' : 's-review')}>{n.status}</span>}
      </div>

      <div className="narr">
        <textarea className="field" rows={14} value={text}
          placeholder={'요즘 출근룩, 이거 하나면 끝이에요\n첫 번째는 10만원대 경량 패딩\n…'}
          onChange={(e) => { dirty.current = true; setText(e.target.value); }} />
        <div className="meter">
          <div><span>줄(컷)</span><b>{rows.length}</b></div>
          <div><span>예상 길이</span><b className={Math.abs(sec - target) > 5 ? 'orange' : ''}>{fmt(sec)}</b></div>
          <div><span>목표</span>
            <span><input type="number" min={15} max={90} value={target} onChange={(e) => { dirty.current = true; setTarget(e.target.value); }}
              style={{ width: 52, border: '1px solid var(--hair)', background: 'var(--paper-2)', padding: '0 4px' }} />초</span></div>
          <div><span>18자 넘는 줄</span><b className={over ? 'orange' : ''}>{over}</b></div>
          <div style={{ display: 'grid', gap: 6 }}>
            <button className="btn" onClick={() => save({ status: '대본 수정됨' }, '저장했어요.')}>나레이션 저장</button>
            <button className="btn dark" disabled={!rows.length} onClick={async () => {
              await save({ status: '쇼츠로 보냄' });
              const t = prompt('쇼츠 제목 (15자 안)', (lf.issue || lf.title || '').slice(0, 15));
              if (!t) return;
              await mkShort(lf, shorts, {
                title: t.trim(), kind: '요약', note: `나레이션 + 월터 음성 · 방향: ${dir || '없음'}`,
                lines: rows.map((r, i) => ({ id: 'n' + i, text: r, on: true, ctx: false })),
              });
              toast('요약 쇼츠 대본을 만들었어요. 확정 전에 월터 음성 생성을 요청하세요.');
            }}>이 나레이션으로 쇼츠</button>
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        말투는 ‘~습니다’와 ‘~어요’를 섞고, 브랜드+정확한 상품명을 쓰고, 과장이나 확인 안 된 수치는 빼요. 예상 길이는 띄어쓰기 뺀 글자수 ÷ 6.2자/초 ÷ 1.1배속으로 계산해요.
      </p>
    </>
  );
}

function ImportJson({ toast }) {
  const ref = useRef(null);
  async function onFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      const lf = j.longform || [], sh = j.shorts || [];
      if (!lf.length && !sh.length) throw new Error('longform / shorts 배열이 없어요');
      if (lf.length) await putMany('longform', lf);
      if (sh.length) await putMany('shorts', sh);
      toast(`롱폼 ${lf.length}개, 쇼츠 ${sh.length}개를 가져왔어요.`);
    } catch (er) { toast('가져오기 실패: ' + er.message); }
    e.target.value = '';
  }
  return (
    <>
      <button className="btn ghost sm" onClick={() => ref.current?.click()}>기존 데이터 가져오기 (JSON)</button>
      <input ref={ref} type="file" accept="application/json" hidden onChange={onFile} />
    </>
  );
}
