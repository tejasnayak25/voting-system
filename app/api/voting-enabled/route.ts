// app/api/voted/route.ts
import { db, firestore } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyCSRFToken } from '@/lib/csrf';

export async function GET() {
  try {
    const votedRef = db.collection('voting-system').doc('system');
    let doc = await votedRef.get();
    let data = doc.data();
    return NextResponse.json({ enabled: data?.votingEnabled }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check voted status' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
    const csrfToken = req.headers.get('x-csrf-token');
    const csrfSecret = cookies().get('csrfSecret')?.value;

    if (!csrfToken || !csrfSecret || !verifyCSRFToken(csrfSecret, csrfToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    let body = await req.json();
    let email = body.email;

    if(!email || typeof email !== 'string' || email !== process.env.ADMIN_MAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const votedRef = db.collection('voting-system').doc('system');
    let doc = await votedRef.get();
    let data = doc.data();
    await votedRef.set({ votingEnabled: !(data?.votingEnabled) }, { merge: true });

    return NextResponse.json({ success: true }, { status: 200 });
}