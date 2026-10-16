import { NextResponse } from 'next/server';

// SITE_PASSWORD가 있으면 팀 비밀번호로 잠금. /api/queue는 토큰으로 따로 검사.
export function middleware(req) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/api/queue')) return NextResponse.next();
  if (req.cookies.get('fptv_pw')?.value === encodeURIComponent(pw)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}
export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };
