// app/api/vote/route.ts
import { db, firestore } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyCSRFToken } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  try {
    const votedRef = db.collection('voting-system').doc('system');
    let doc = await votedRef.get();
    let data = doc.data();
    if (!data || !data.votingEnabled) {
      return NextResponse.json({ error: 'Voting is not enabled' }, { status: 403 });
    }

    const body = await req.json();
    const { candidateIds, email } = body;

    const csrfToken = req.headers.get('x-csrf-token');
    const csrfSecret = cookies().get('csrfSecret')?.value;

    if (!csrfToken || !csrfSecret || !verifyCSRFToken(csrfSecret, csrfToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    if(data.votedUsers && data.votedUsers.includes(email)) {
      return NextResponse.json({ error: 'You\'ve voted already' }, { status: 403 });
    }

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0 || !email) {
      return NextResponse.json({ error: 'Missing candidateIds or email' }, { status: 400 });
    }

    let candidatesRef = db.collection('voting-system').doc('election').collection('candidates');
    const batch = db.batch();
    candidateIds.forEach((id: string) => {
      const ref = candidatesRef.doc(id);
      batch.update(ref, { votes: firestore.FieldValue.increment(1) });
    });
    batch.set(votedRef, { votedUsers: firestore.FieldValue.arrayUnion(email) }, { merge: true });
    await batch.commit();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cast votes' }, { status: 500 });
  }
}