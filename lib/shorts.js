// 쇼츠 규칙 — 마인드맵 3~4단계 기준
export const STEPS = ['대본 검토', '대본 수정됨', '확정', '제작 중', '완료'];
export const STATUS_CLASS = {
  '대기': 's-wait', '대본 검토': 's-review', '대본 수정됨': 's-edited', '확정': 's-ok', '제작 중': 's-run', '완료': 's-done', '수정 요청': 's-review',
};
export const KINDS = { 요약: '① 요약', 개별: '② 개별', 드래그: '③ 드래그' };

export const CAP = 18; // 자막 한 컷 글자수 기준(띄어쓰기 제외)
export const nsp = (s) => String(s || '').replace(/\s/g, '').length;
// 나레이션 길이 추정: 한국어 낭독 약 6.2자/초(띄어쓰기 제외) × 1.1배속
export const estSec = (text, speed = 1.1) => nsp(text) / 6.2 / speed;
export const fmt = (s) => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// 구간(챕터) 나누기: chapters=[{k,title}] (k = 시작 줄 번호)
export function segments(lf) {
  const L = lf.lines || [];
  const ch = (lf.chapters || []).filter((c) => c.k >= 0 && c.k < L.length).sort((a, b) => a.k - b.k);
  if (!ch.length) return L.length ? [{ title: '전체', from: 0, to: L.length - 1 }] : [];
  const out = [];
  if (ch[0].k > 0) out.push({ title: '도입', from: 0, to: ch[0].k - 1 });
  ch.forEach((c, i) => out.push({ title: c.title || `구간 ${i + 1}`, from: c.k, to: (ch[i + 1]?.k ?? L.length) - 1 }));
  return out;
}
const segDur = (L, s) => (L[s.to]?.[1] ?? 0) - (L[s.from]?.[0] ?? 0);

// Claude 추천 표시(마인드맵 3단계 점선 상자 기준)
export function recommend(lf) {
  const L = lf.lines || [];
  const segs = segments(lf).filter((s) => s.title !== '도입');
  if (!L.length) return null;
  if (segs.length <= 1) return { pick: '요약', why: '구간이 나뉘어 있지 않아 한 편으로 줄이는 쪽이 자연스러워요.' };
  const durs = segs.map((s) => segDur(L, s));
  const fit = durs.filter((d) => d >= 30 && d <= 75).length;
  const short = durs.filter((d) => d < 25).length;
  const rank = /비교|랭킹|순위|best|베스트|top|추천\s?\d|가지/i.test((lf.title || '') + ' ' + (lf.issue || ''));
  if (rank) return { pick: '요약', why: '비교·랭킹형이라 한 편에 몰아 보여 주는 쪽이 맞아요.' };
  if (short >= segs.length / 2) return { pick: '요약', why: `구간 ${segs.length}개 중 ${short}개가 25초 미만으로 짧아요.` };
  if (fit >= segs.length / 2) return { pick: '개별', why: `구간 ${segs.length}개 중 ${fit}개가 원본 대사로 30~75초가 서요.` };
  return { pick: '요약', why: '구간 길이가 들쭉날쭉해 요약 한 편이 안전해요.' };
}

export function nextNo(shorts, project) {
  const nos = shorts.filter((x) => x.project === project).map((x) => parseInt(x.no, 10) || 0);
  return String((nos.length ? Math.max(...nos) : 0) + 1).padStart(2, '0');
}

// 고른 줄 → 쇼츠 lines (앞뒤 한 줄은 회색 문맥)
export function pickLines(L, ks) {
  const clean = (t) => String(t).replace(/^\((.*)\)$/, '$1');
  const set = new Set(ks);
  const want = new Map();
  ks.forEach((k) => want.set(k, true));
  ks.forEach((k) => {
    if (!set.has(k - 1) && k - 1 >= 0 && !want.has(k - 1)) want.set(k - 1, false);
    if (!set.has(k + 1) && k + 1 < L.length && !want.has(k + 1)) want.set(k + 1, false);
  });
  return [...want.keys()].sort((a, b) => a - b).map((k) => ({
    id: Number(L[k][0]).toFixed(2), t0: L[k][0], t1: L[k][1], text: clean(L[k][2]), on: want.get(k), ctx: !want.get(k),
  }));
}

export const SAMPLE_LF = {
  id: 'lf-sample',
  project: '예시',
  title: '예시 · 가을 아우터 3가지',
  folder: 'U:\\[쇼츠]\\예시',
  issue: '가을 아우터',
  createdAt: 0,
  sample: true,
  chapters: [{ k: 2, title: '1. 경량 패딩' }, { k: 7, title: '2. 후드 집업' }, { k: 12, title: '3. 코치 자켓' }],
  lines: [
    [0, 3.1, '안녕하세요, 페플TV입니다.'],
    [3.1, 7.4, '오늘은 지금 바로 입기 좋은 가을 아우터 세 가지를 가져왔어요.'],
    [7.4, 12.2, '첫 번째는 10만원대로 살 수 있는 경량 패딩입니다.'],
    [12.2, 18.0, '얇은데 생각보다 따뜻해서 셔츠 위에 하나만 걸쳐도 충분하구요.'],
    [18.0, 24.5, '어깨 라인이 각지지 않아서 체형 상관없이 잘 맞습니다.'],
    [24.5, 31.0, '색은 블랙, 차콜, 올리브 세 가지인데 올리브가 제일 반응이 좋았어요.'],
    [31.0, 38.2, '접어서 파우치에 넣을 수 있어서 출장 갈 때도 편합니다.'],
    [38.2, 43.0, '두 번째는 오버핏 후드 집업이에요.'],
    [43.0, 49.6, '원단이 도톰해서 단독으로 입어도 핏이 무너지지 않구요.'],
    [49.6, 56.1, '지퍼를 끝까지 올리면 넥 라인이 깔끔하게 서는 게 포인트입니다.'],
    [56.1, 62.0, '안에 반팔 티 하나만 받쳐도 바로 외출 가능해요.'],
    [62.0, 68.3, '사이즈는 평소보다 한 치수 작게 가셔도 충분히 여유 있습니다.'],
    [68.3, 73.5, '마지막은 코치 자켓입니다.'],
    [73.5, 80.2, '나일론 소재라 가볍고, 비 오는 날에도 부담이 없어요.'],
    [80.2, 86.9, '안감이 메쉬라 늦가을까지 레이어드하기 좋구요.'],
    [86.9, 92.4, '오늘 소개한 세 가지 중에 어떤 게 제일 끌리시는지 댓글로 알려 주세요.'],
  ],
};
