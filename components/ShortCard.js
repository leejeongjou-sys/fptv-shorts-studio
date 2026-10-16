'use client';
import { useState } from 'react';
import { patch, remove, who } from '@/lib/store';
import { STEPS, STATUS_CLASS, KINDS, CAP, nsp, fmt } from '@/lib/shorts';

export default function ShortCard({ s, toast }) {
  const [fx, setFx] = useState('');
  const lines = s.lines || [];
  const locked = ['확정', '제작 중'].includes(s.status);
  const stepIdx = STEPS.indexOf(s.status === '수정 요청' ? '확정' : s.status);
  const on = lines.filter((l) => l.on);
  const dur = s.kind === '요약' ? null : on.reduce((a, l) => a + ((l.t1 ?? 0) - (l.t0 ?? 0)), 0);
  const me = who() || '팀원';

  async function save(upd, msg) {
    try {
      const st = s.status === '대본 검토' && upd.lines ? { status: '대본 수정됨' } : {};
      await patch('shorts', s.id, { ...upd, ...st, updatedAt: Date.now(), updatedBy: me });
      msg && toast(msg);
    } catch (e) { toast('저장 실패: ' + e.message); }
  }
  const setLine = (i, v) => save({ lines: lines.map((l, j) => (j === i ? { ...l, ...v } : l)) });

  return (
    <article className="sc">
      <div className="hd">
        <span className="no">{s.no}</span>
        <div style={{ minWidth: 0 }}>
          <div className="ti">{s.title}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {KINDS[s.kind] || s.kind} · 선택 {on.length}줄{dur != null && ` · 약 ${fmt(dur)}`}
            {s.updatedBy && ` · ${s.updatedBy}`}
          </div>
        </div>
        <span className={'pill ' + (STATUS_CLASS[s.status] || 's-wait')}>{s.status}</span>
      </div>
      <div className="bd">
        <div className="stepper" aria-label="진행 단계">
          {STEPS.map((st, i) => (
            <span key={st} className={i < stepIdx || s.status === '완료' ? 'd' : i === stepIdx ? 'a' : ''}>{st}</span>
          ))}
        </div>

        {lines.map((l, i) => {
          const n = nsp(l.text);
          return (
            <div key={l.id + i} className={'sl' + (l.on ? '' : ' ctx')}>
              <input type="checkbox" checked={!!l.on} disabled={locked} aria-label="이 줄 쓰기"
                onChange={(e) => setLine(i, { on: e.target.checked, ctx: !e.target.checked })} />
              <span className="tx" contentEditable={!locked} suppressContentEditableWarning
                onBlur={(e) => { const v = e.currentTarget.innerText.trim(); if (v !== l.text) setLine(i, { text: v }); }}>
                {l.text}
              </span>
              <span className={'len' + (s.kind === '요약' && n > CAP ? ' over' : '')} title="자막 글자수(띄어쓰기 제외)">
                {n}자{l.t0 != null && s.kind !== '요약' ? ` · ${fmt(l.t0)}` : ''}
              </span>
              {!locked && (
                <span className={'fb' + (l.fb ? ' has' : '')}>
                  {l.fb ? <>✎ {l.fb} </> : null}
                  <button className="btn sm ghost" style={{ padding: '0 6px', fontSize: 11 }}
                    onClick={() => { const v = prompt('이 컷 피드백 (이미지 교체, 오타 등)', l.fb || ''); if (v !== null) setLine(i, { fb: v.trim() }); }}>
                    {l.fb ? '피드백 고치기' : '컷 피드백'}
                  </button>
                </span>
              )}
            </div>
          );
        })}

        {s.note && <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>{s.note}</p>}
        {s.memo && <p className="orange" style={{ fontSize: 12.5, margin: '6px 0 0' }}>Claude 메모 · {s.memo}</p>}

        <div className="acts" style={{ marginTop: 12 }}>
          {['대본 검토', '대본 수정됨', '대기'].includes(s.status) && (
            <button className="btn dark" disabled={!on.length}
              onClick={() => save({ status: '확정', confirmedAt: Date.now(), confirmedBy: me }, '확정했어요. 다음 정각 29분 작업에서 영상을 만들어요.')}>
              확정 → 영상 제작
            </button>
          )}
          {s.status === '확정' && (
            <button className="btn" onClick={() => save({ status: '대본 수정됨' }, '확정을 풀었어요.')}>확정 취소</button>
          )}
          {s.status === '제작 중' && <span className="muted" style={{ fontSize: 13 }}>PC에서 영상을 만드는 중이에요.</span>}
          {(s.videoUrl || s.preview) && (
            <a className="btn navy" href={s.videoUrl || s.preview} target="_blank" rel="noreferrer">영상 보기</a>
          )}
          {s.output && <span className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>{s.output}</span>}
          {!locked && (
            <button className="btn ghost sm" style={{ marginLeft: 'auto' }}
              onClick={async () => { if (confirm(`'${s.title}' 쇼츠를 지울까요?`)) { await remove('shorts', s.id); toast('지웠어요.'); } }}>
              삭제
            </button>
          )}
        </div>

        {['완료', '수정 요청'].includes(s.status) && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--ink)', paddingTop: 10 }}>
            <div className="acts">
              <input className="field" style={{ flex: '1 1 220px', width: 'auto' }} placeholder="완성 영상 수정 요청 (예: 3번째 컷 이미지 교체)"
                value={fx} onChange={(e) => setFx(e.target.value)} />
              <button className="btn dark" disabled={!fx.trim()}
                onClick={async () => {
                  await save({ status: '수정 요청', fixes: [...(s.fixes || []), { text: fx.trim(), at: Date.now(), by: me }] }, '수정 요청을 남겼어요.');
                  setFx('');
                }}>수정 요청</button>
            </div>
            {(s.fixes || []).slice(-3).map((f, i) => (
              <div key={i} className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                · {f.text} <small>({f.by}{f.done ? ' · 반영됨' : ''})</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
