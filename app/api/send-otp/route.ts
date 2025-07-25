import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;
    if (!email) {
      return NextResponse.json({ error: 'Missing email or otp' }, { status: 400 });
    }

    let otp = Math.floor(100000 + Math.random() * 900000).toString();

    let smtpAuth = JSON.parse(process.env.SMTP_AUTH ?? '{}');

    const transporter = nodemailer.createTransport({
      host: smtpAuth.host,
      port: 465,
      secure: true,
      auth: {
        user: smtpAuth.user,
        pass: smtpAuth.pass,
      },
    });

    const mailOptions = {
      from: smtpAuth.user,
      to: email,
      subject: 'Your OTP for SODE Voting System',
      text: `Your OTP is: ${otp}`,
    };

    if(email === "admin@sode-edu.in") {
      console.log("Admin otp:", otp);
    } else {
      await transporter.sendMail(mailOptions);
    }
    const otpsRef = db.collection('voting-system').doc('login').collection('users');
    await otpsRef.doc(email).set({ otp }, { merge: true }); // Store OTP in Firestore
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
