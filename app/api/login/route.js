import { NextResponse } from 'next/server';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.SITE_PASSWORD || password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('fptv_pw', encodeURIComponent(password), { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
