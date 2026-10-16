'use client';
import Link from 'next/link';
import { useCol } from '@/lib/hooks';
import { STATUS_CLASS, KINDS } from '@/lib/shorts';

const ORDER = ['대본 검토', '대본 수정됨', '확정', '제작 중', '수정 요청', '완료'];

export default function Home() {
  const [shorts, loaded] = useCol('shorts');
  const [lfs] = useCol('longform');
  const [notes] = useCol('mapNotes');
  const [st] = useCol('status');
  const by = (s) => shorts.filter((x) => x.status === s).length;
  const waiting = notes.filter((n) => !n.reply).length;
  const recent = [...shorts].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8);
  const now = st.find((x) => x.id === 'map-longform')?.status;

  return (
    <>
      <p className="eyebrow">Overview</p>
      <h1 className="head">오늘의 쇼츠 데스크</h1>
      <p className="lede">롱폼에서 뽑은 쇼츠가 지금 어디까지 왔는지 한눈에 봐요. 숫자를 누르면 해당 화면으로 가요.</p>
      {now && (
        <div className="status-strip"><b>지금 상황</b><div>{now}</div></div>
      )}

      <div className="kpis">
        <Link href="/shorts" className="total" style={{ textDecoration: 'none' }}><small>롱폼</small><b>{lfs.length}</b></Link>
        <Link href="/shorts" className="total" style={{ textDecoration: 'none' }}><small>검토할 대본</small><b>{by('대본 검토') + by('대본 수정됨')}</b></Link>
        <Link href="/shorts" className="total" style={{ textDecoration: 'none' }}><small>제작 대기·진행</small><b>{by('확정') + by('제작 중') + by('수정 요청')}</b></Link>
        <Link href="/shorts" className="total dark" style={{ textDecoration: 'none' }}><small>완료</small><b>{by('완료')}</b></Link>
        <Link href="/map/longform" className="total" style={{ textDecoration: 'none' }}><small>답 대기 의견</small><b>{waiting}</b></Link>
      </div>

      <div className="thead" style={{ gridTemplateColumns: '48px minmax(0,1fr) 110px 90px 110px' }}>
        <span>No</span><span>쇼츠</span><span>롱폼</span><span>갈래</span><span>상태</span>
      </div>
      {loaded && !recent.length && <div className="empty" style={{ marginTop: 8 }}>아직 쇼츠가 없어요. <Link href="/shorts">쇼츠 만들기</Link>에서 시작하세요.</div>}
      {recent.map((s) => (
        <Link key={s.id} href="/shorts" className="row click" style={{ gridTemplateColumns: '48px minmax(0,1fr) 110px 90px 110px', textDecoration: 'none' }}>
          <span style={{ font: '600 18px var(--display)' }}>{s.no}</span>
          <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{s.title}</span>
          <span className="muted" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.project}</span>
          <span style={{ fontSize: 12.5 }}>{KINDS[s.kind] || s.kind}</span>
          <span><span className={'pill ' + (STATUS_CLASS[s.status] || 's-wait')}>{s.status}</span></span>
        </Link>
      ))}

      <hr className="rule" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        <Link href="/map/longform" className="row click" style={{ display: 'block', textDecoration: 'none', padding: 18 }}>
          <p className="eyebrow">Mind Map 01</p>
          <b style={{ font: '600 22px/1.2 var(--display)' }}>롱폼 → 쇼츠 마인드맵</b>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>폴더 넣기부터 검수·전달까지 6단계 규칙</p>
        </Link>
        <Link href="/map/magazine" className="row click" style={{ display: 'block', textDecoration: 'none', padding: 18 }}>
          <p className="eyebrow">Mind Map 02</p>
          <b style={{ font: '600 22px/1.2 var(--display)' }}>매거진 에디터 업무 지도</b>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>트렌드 뉴스 → 주제 의뢰 → 영상 완료</p>
        </Link>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>상태 흐름: {ORDER.join(' → ')}</p>
    </>
  );
}
