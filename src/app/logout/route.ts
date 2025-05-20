import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await signOut(auth);
    return NextResponse.redirect(new URL('/login', req.url));
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}