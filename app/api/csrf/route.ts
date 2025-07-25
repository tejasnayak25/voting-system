// app/api/csrf/route.js
import { cookies } from 'next/headers';
import { generateCSRFSecret, createCSRFToken } from '@/lib/csrf';
import { NextResponse } from 'next/server';

export async function GET() {
  const csrfSecret = generateCSRFSecret();
  const csrfToken = createCSRFToken(csrfSecret);

  cookies().set('csrfSecret', csrfSecret, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
  });

  return NextResponse.json({ csrfToken });
}