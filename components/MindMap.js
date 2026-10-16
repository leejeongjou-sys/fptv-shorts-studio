'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCol, useToast } from '@/lib/hooks';
import { put, patch, remove, putMany, uid, who } from '@/lib/store';
import { MAPS, seedDocs } from '@/lib/maps';

const TYPES = ['rule', 'new', 'sug', 'memo'];
const TYPE_NAME = { rule: '이미 정한 규칙', new: '이번에 추가한 방향', sug: 'Claude 제안(미확정)', memo: '자유 메모' };
const ago = (t) => {
  if (!t) return '';
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function MindMap({ mapKey }) {
  const M = MAPS[mapKey];
  const [all, loaded, err] = useCol('mapNodes');
  const [allNotes] = useCol('mapNotes');
  const [statusDocs, stLoaded] = useCol('status');
  const [msg, toast] = useToast();
  const [free, setFree] = useState('');
  const seeded = useRef(false);
  const me = () => who() || '팀원';

  const nodes = useMemo(() => all.filter((x) => x.map === mapKey), [all, mapKey]);
  const notes = useMemo(() => allNotes.filter((x) => x.map === mapKey).sort((a, b) => (b.at || 0) - (a.at || 0)), [allNotes, mapKey]);
  const meta = statusDocs.find((x) => x.id === 'map-' + mapKey);
  const stages = meta?.stages || M.stages;

  // 처음 열면 기본 가지 채우기
  useEffect(() => {
    if (!loaded || !stLoaded || seeded.current) return;
    seeded.current = true;
    if (!nodes.length) putMany('mapNodes', seedDocs(mapKey)).catch((e) => toast('초기 내용 저장 실패: ' + e.message));
    if (!meta) put('status', 'map-' + mapKey, { stages: M.stages, status: M.status, updatedAt: Date.now() }).catch(() => {});
  }, [loaded, stLoaded, nodes.length, meta, mapKey, M, toast]);

  const saveMeta = (upd) => patch('status', 'map-' + mapKey, { ...upd, updatedAt: Date.now(), updatedBy: me() }).catch((e) => toast(e.message));
  const edit = (id, upd) => patch('mapNodes', id, { ...upd, updatedAt: Date.now(), by: me() }).catch((e) => toast('저장 실패: ' + e.message));

  async function add(stage, parent = null, after = null, type = 'new') {
    const sib = nodes.filter((x) => x.stage === stage && (x.parent || null) === parent).sort((a, b) => a.order - b.order);
    let order = (sib.at(-1)?.order || 0) + 10;
    if (after) { const i = sib.findIndex((x) => x.id === after.id); order = sib[i + 1] ? (after.order + sib[i + 1].order) / 2 : after.order + 10; }
    await put('mapNodes', uid(mapKey + '-'), { map: mapKey, stage, parent, order, title: type === 'memo' ? '메모' : '새 가지', body: '', type, createdAt: Date.now(), by: me() });
  }
  async function del(nd) {
    const kids = nodes.filter((x) => x.parent === nd.id);
    if (!confirm(kids.length ? `'${nd.title}'와 아래 가지 ${kids.length}개를 지울까요?` : `'${nd.title}'를 지울까요?`)) return;
    const rm = async (x) => { for (const k of nodes.filter((y) => y.parent === x.id)) await rm(k); await remove('mapNodes', x.id); };
    await rm(nd);
  }
  async function move(nd, dir) {
    const sib = nodes.filter((x) => x.stage === nd.stage && (x.parent || null) === (nd.parent || null)).sort((a, b) => a.order - b.order);
    const i = sib.findIndex((x) => x.id === nd.id); const j = i + dir;
    if (j < 0 || j >= sib.length) return;
    await edit(nd.id, { order: sib[j].order }); await edit(sib[j].id, { order: nd.order });
  }
  async function note(nodeId, nodeTitle) {
    const t = prompt(nodeTitle ? `'${nodeTitle}'에 남길 메모` : '메모');
    if (!t || !t.trim()) return;
    await put('mapNotes', uid('n-'), { map: mapKey, nodeId, nodeTitle: nodeTitle || null, text: t.trim(), by: me(), at: Date.now() });
    toast('메모를 남겼어요. 다음 작업 때 Claude가 읽고 답을 달아요.');
  }
  async function addStage() {
    const name = prompt('새 단계 이름'); if (!name) return;
    await saveMeta({ stages: [...stages, name.trim()] });
  }
  async function renameStage(i, v) {
    if (!v || v === stages[i]) return;
    const s = [...stages]; s[i] = v; await saveMeta({ stages: s });
  }
  async function dropStage(i) {
    if (nodes.some((x) => x.stage === i)) return toast('가지가 남아 있는 단계는 지울 수 없어요. 가지를 먼저 지워 주세요.');
    if (i !== stages.length - 1) return toast('마지막 단계만 지울 수 있어요.');
    await saveMeta({ stages: stages.slice(0, -1) });
  }

  const tree = (stage, parent, depth) =>
    nodes.filter((x) => x.stage === stage && (x.parent || null) === parent).sort((a, b) => a.order - b.order)
      .flatMap((nd) => [
        <Node key={nd.id} nd={nd} depth={depth} notes={notes.filter((x) => x.nodeId === nd.id)}
          onEdit={edit} onAdd={() => add(stage, nd.id)} onSib={() => add(stage, parent, nd)} onDel={() => del(nd)}
          onMove={(d) => move(nd, d)} onNote={() => note(nd.id, nd.title)} />,
        ...tree(stage, nd.id, depth + 1),
      ]);

  return (
    <>
      <p className="eyebrow">Mind Map</p>
      <h1 className="head">{M.title}</h1>
      <p className="lede">{M.lede}</p>
      {err && <div className="banner">저장소를 읽지 못했어요: {err.message}</div>}

      <div className="status-strip">
        <b>지금 상황</b>
        <div contentEditable suppressContentEditableWarning
          onBlur={(e) => { const v = e.currentTarget.innerText.trim(); if (v !== (meta?.status || '')) saveMeta({ status: v }); }}>
          {meta?.status ?? M.status}
        </div>
      </div>

      <div className="legend">
        {TYPES.map((t) => <span key={t}><i className={'lg-' + t} />{TYPE_NAME[t]}</span>)}
        <span className="muted">· 단계 빈 곳 더블클릭 = 메모 · 상자에 마우스를 올리면 도구가 보여요</span>
      </div>

      <div className="mapwrap">
        <div className="map">
          <div className="stage root" style={{ paddingLeft: 0 }}>
            <div className="total dark" style={{ minHeight: 120, justifyItems: 'start', padding: '18px 16px' }}>
              <small>{M.root[1]}</small>
              <b style={{ fontSize: 26 }}>{M.root[0]}</b>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              가지 {nodes.length}개 · 의견 {notes.length}개
            </p>
          </div>
          {stages.map((st, i) => (
            <div key={i} className="stage">
              <div className="sh">
                <span className="n">{i + 1}</span>
                <span className="nm" contentEditable suppressContentEditableWarning
                  onBlur={(e) => renameStage(i, e.currentTarget.innerText.trim())}>{st}</span>
              </div>
              <div className="nodes" style={{ minHeight: 80 }}
                onDoubleClick={(e) => { if (e.target === e.currentTarget) add(i, null, null, 'memo'); }}>
                {tree(i, null, 0)}
                <div className="acts" style={{ gap: 4 }}>
                  <button className="btn ghost sm" onClick={() => add(i)}>+ 가지</button>
                  {i === stages.length - 1 && <button className="btn ghost sm" onClick={() => dropStage(i)}>단계 지우기</button>}
                </div>
              </div>
            </div>
          ))}
          <div className="addstage"><button className="btn ghost sm" onClick={addStage}>+ 단계</button></div>
        </div>
      </div>

      <div className="notes">
        <div>
          <p className="eyebrow">자유 메모</p>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>어느 가지에도 안 맞는 생각, 새로 넣고 싶은 단계, 전체 방향 같은 건 여기에 써 주세요.</p>
          <textarea className="field" rows={4} value={free} onChange={(e) => setFree(e.target.value)} placeholder="예: 쇼츠 첫 컷에 가격을 크게 넣어 보면 어떨까" />
          <div className="acts" style={{ marginTop: 8 }}>
            <button className="btn dark" disabled={!free.trim()} onClick={async () => {
              await put('mapNotes', uid('n-'), { map: mapKey, nodeId: null, nodeTitle: null, text: free.trim(), by: me(), at: Date.now() });
              setFree(''); toast('남겼어요.');
            }}>메모 남기기</button>
          </div>
        </div>
        <div>
          <p className="eyebrow">남긴 의견 {notes.length}</p>
          {!notes.length && <p className="muted" style={{ fontSize: 13 }}>아직 의견이 없어요.</p>}
          {notes.map((x) => (
            <div key={x.id} className="note">
              <div className="meta">
                <span>{x.nodeTitle ? `‘${x.nodeTitle}’` : '자유 메모'}</span><span>{x.by}</span><span>{ago(x.at)}</span>
                {!x.reply && <span className="orange">답 대기</span>}
                <button className="btn ghost sm" style={{ marginLeft: 'auto', padding: '0 6px', fontSize: 11 }}
                  onClick={() => confirm('이 의견을 지울까요?') && remove('mapNotes', x.id)}>삭제</button>
              </div>
              <div>{x.text}</div>
              {x.reply && <div className="reply">Claude · {x.reply}</div>}
            </div>
          ))}
        </div>
      </div>
      {msg && <div className="toast" role="status">{msg}</div>}
    </>
  );
}

function Node({ nd, depth, notes, onEdit, onAdd, onSib, onDel, onMove, onNote }) {
  const cycle = () => onEdit(nd.id, { type: TYPES[(TYPES.indexOf(nd.type) + 1) % TYPES.length] });
  return (
    <div className={`node t-${nd.type || 'rule'}${depth ? ' child' : ''}`} style={depth > 1 ? { marginLeft: 16 * depth } : undefined}>
      {nd.type === 'new' && <span className="badge tag o">NEW</span>}
      <span className="ttl" contentEditable suppressContentEditableWarning
        onBlur={(e) => { const v = e.currentTarget.innerText.trim(); if (v && v !== nd.title) onEdit(nd.id, { title: v }); }}>{nd.title}</span>
      <span className="body" contentEditable suppressContentEditableWarning
        onBlur={(e) => { const v = e.currentTarget.innerText.trim(); if (v !== (nd.body || '')) onEdit(nd.id, { body: v }); }}>{nd.body}</span>
      {notes.length > 0 && (
        <div className="memos">
          {notes.slice().reverse().map((m) => (
            <div key={m.id} className="memo">
              <span className="by">{m.by} · </span>{m.text}
              {m.reply && <div className="reply">{m.reply}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="tools">
        <button onClick={onAdd} title="아래로 가지">+ 가지</button>
        <button onClick={onSib} title="같은 줄에 추가">+ 옆</button>
        <button onClick={onNote}>메모</button>
        <button onClick={cycle} title={TYPE_NAME[nd.type]}>종류</button>
        <button onClick={() => onMove(-1)} aria-label="위로">↑</button>
        <button onClick={() => onMove(1)} aria-label="아래로">↓</button>
        <button onClick={onDel}>삭제</button>
      </div>
    </div>
  );
}
