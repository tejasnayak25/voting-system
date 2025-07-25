import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const candidatesRef = db.collection('voting-system').doc('election').collection('candidates');
    const snapshot = await candidatesRef.get();
    const candidates = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json({ candidates }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 });
    }
    const { name, position, description } = body;
    if (!name || !position || !description) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const candidatesRef = db.collection('voting-system').doc('election').collection('candidates');
    const docRef = await candidatesRef.add({
      name,
      position,
      description,
      votes: 0,
    });
    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'Missing candidate id' }, { status: 400 });
    }
    const candidatesRef = db.collection('voting-system').doc('election').collection('candidates');
    await candidatesRef.doc(id).delete();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}