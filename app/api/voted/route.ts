// app/api/voted/route.ts
import { db } from '@/lib/firebase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid email' }, { status: 400 });
  }

  try {
    const votedRef = db.collection('voting-system').doc('system');
    let doc = await votedRef.get();
    let data = doc.data();
    let voted = false;
    if (data && Array.isArray(data.votedUsers) && data.votedUsers.includes(email)) {
      voted = true;
    }
    return NextResponse.json({ voted }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check voted status' }, { status: 500 });
  }
}