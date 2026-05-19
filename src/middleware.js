import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

export function middleware(request) {
  if (request.cookies.has('visitorId')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set('visitorId', nanoid(16), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });
  return response;
}
