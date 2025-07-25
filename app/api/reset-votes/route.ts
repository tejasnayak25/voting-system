// app/api/voted/route.ts
import { db } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyCSRFToken } from '@/lib/csrf';

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

    try {
        const candidatesRef = db.collection('voting-system').doc('election').collection('candidates');
        const candidates = await candidatesRef.get();

        let batch = db.batch();

        if(candidates) {
            for (const candidate of candidates.docs) {
                batch.update(candidate.ref, { votes: 0 });
            }
        }

        const votedRef = db.collection('voting-system').doc('system');
        batch.set(votedRef, { votedUsers: [] }, { merge: true });

        await batch.commit();

        return NextResponse.json({ success: true }, { status: 200 });
    } catch(e) {
        return NextResponse.json({ error: e }, { status: 500 });
    }
}