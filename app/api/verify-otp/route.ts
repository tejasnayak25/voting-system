import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp } = body;
    if (!email) {
      return NextResponse.json({ error: 'Missing email or otp' }, { status: 400 });
    }

    const otpsRef = db.collection('voting-system').doc('login').collection('users');
    const otpDoc = await otpsRef.doc(email).get();
    if (!otpDoc.exists) {
      return NextResponse.json({ error: 'OTP not found for this email' }, { status: 404 });
    }
    await otpsRef.doc(email).delete();
    if (otpDoc.data()?.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    const votedRef = db.collection('voting-system').doc('system');
    let doc = await votedRef.get();
    let data = doc.data();
    let hasVoted = false;
    if (data && data.votedUsers && data.votedUsers.includes(email)) {
      hasVoted = true;
    }
    
    return NextResponse.json({ success: true, hasVoted: hasVoted }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
