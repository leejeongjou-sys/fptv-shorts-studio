// PC 예약 작업(매시 29분 / 59분)이 쓰는 통로.
//   GET  /api/queue?col=shorts&status=확정        → 확정된 쇼츠 목록 (영상 만들 차례)
//   GET  /api/queue?col=longform                   → 롱폼 목록
//   GET  /api/queue?col=mapNotes&map=longform      → 마인드맵 메모 (Claude 답 달기용)
//   POST /api/queue  { col, id, data, merge }      → 문서 만들기/고치기 (예: 영상 완료, 전체 대본 올리기)
// 헤더: Authorization: Bearer <QUEUE_TOKEN>
import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
const COLS = ['shorts', 'longform', 'mapNodes', 'mapNotes', 'status'];
const PREFIX = process.env.NEXT_PUBLIC_COLLECTION_PREFIX || '';

function db() {
  if (!getApps().length) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    initializeApp({ credential: cert(sa) });
  }
  return getFirestore();
}
function authed(req) {
  const t = process.env.QUEUE_TOKEN;
  return !!t && req.headers.get('authorization') === `Bearer ${t}`;
}
const bad = (msg, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

export async function GET(req) {
  if (!authed(req)) return bad('토큰이 없거나 맞지 않아요', 401);
  const p = req.nextUrl.searchParams;
  const col = p.get('col') || 'shorts';
  if (!COLS.includes(col)) return bad('모르는 컬렉션');
  let q = db().collection(PREFIX + col);
  if (p.get('status')) q = q.where('status', '==', p.get('status'));
  if (p.get('map')) q = q.where('map', '==', p.get('map'));
  if (p.get('project')) q = q.where('project', '==', p.get('project'));
  const snap = await q.get();
  return NextResponse.json({ ok: true, items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function POST(req) {
  if (!authed(req)) return bad('토큰이 없거나 맞지 않아요', 401);
  const body = await req.json().catch(() => null);
  if (!body || !COLS.includes(body.col) || !body.id || typeof body.data !== 'object') return bad('col, id, data가 필요해요');
  const ref = db().collection(PREFIX + body.col).doc(String(body.id));
  await ref.set({ ...body.data, updatedAt: Date.now(), updatedBy: body.data.updatedBy || 'Claude' }, { merge: body.merge !== false });
  return NextResponse.json({ ok: true });
}
