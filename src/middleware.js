import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { basePath } from './lib/paths.js';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (basePath && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = basePath;
    return withVisitorCookie(request, NextResponse.redirect(url));
  }

  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(basePath.length) || '/';
    return withVisitorCookie(request, NextResponse.rewrite(url));
  }

  return withVisitorCookie(request, NextResponse.next());
}

function withVisitorCookie(request, response) {
  if (request.cookies.has('visitorId')) {
    return response;
  }

  response.cookies.set('visitorId', nanoid(16), {
    httpOnly: true,
    sameSite: 'lax',
    path: basePath || '/',
    maxAge: 60 * 60 * 24 * 365
  });
  return response;
}
